import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  scoreConversation,
  type ScoringThresholdConfig,
  DEFAULT_SCORING_THRESHOLDS,
} from '../../src/modules/nlp/domain/conversation-scoring.js';
import {
  CONVERSATION_TIERS,
  SCORING_RULE_GROUPS,
  type ConversationTier,
} from '../../src/modules/nlp/domain/scoring.constants.js';
import type { KeywordRuleItem } from '../../src/modules/nlp/keyword-scoring.js';
import { HeuristicAmbiguityResolver } from '../../src/modules/nlp/application/llm-ambiguity-gateway.service.js';
import { MULTI_DOMAIN_BENCHMARK_RULES } from '../../src/modules/nlp/domain/scoring-rules.presets.js';

describe('100-Conversation Labeled Benchmark & Evaluation (Multi-domain CRM)', () => {
  // Sử dụng bộ quy tắc từ khóa mẫu đa ngành được quản lý tập trung từ domain presets
  const benchmarkRules = MULTI_DOMAIN_BENCHMARK_RULES;

  const thresholdConfig: ScoringThresholdConfig = {
    ...DEFAULT_SCORING_THRESHOLDS,
    hotMinScore: 8,
    warmMinScore: 4,
    coldMinScore: 1,
    phoneBonusScore: 5,
    inactivityDecayDays: 14,
    inactivityDecayPoints: 3,
  };

  interface CsvRow {
    id: string;
    messages: string[];
    daysInactive: number;
    groundTruthTier: ConversationTier;
    notes: string;
  }

  function parseCsv(content: string): CsvRow[] {
    const lines = content.split('\r\n').join('\n').split('\n');
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const tokens: string[] = [];
      let insideQuote = false;
      let currentToken = '';

      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const char = line[charIdx];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          tokens.push(currentToken.trim());
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
      tokens.push(currentToken.trim());

      if (tokens.length >= 4) {
        const id = tokens[0];
        const rawMessages = tokens[1].replace(/^"|"$/g, '');
        const messages = rawMessages.split('|').map((m) => m.trim());
        const daysInactive = parseInt(tokens[2], 10) || 0;
        const groundTruthTier = tokens[3].toUpperCase() as ConversationTier;
        const notes = tokens[4] ? tokens[4].replace(/^"|"$/g, '') : '';

        rows.push({
          id,
          messages,
          daysInactive,
          groundTruthTier,
          notes,
        });
      }
    }

    return rows;
  }

  it('phải đọc đúng 100 mẫu hội thoại gán nhãn từ file CSV với 25 mẫu mỗi nhóm', () => {
    const csvPath = path.resolve(__dirname, '../../benchmark/dataset-conversations-100.csv');
    expect(fs.existsSync(csvPath)).toBe(true);

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvContent);
    expect(rows.length).toBe(100);

    const hotCount = rows.filter((r) => r.groundTruthTier === CONVERSATION_TIERS.HOT).length;
    const warmCount = rows.filter((r) => r.groundTruthTier === CONVERSATION_TIERS.WARM).length;
    const coldCount = rows.filter((r) => r.groundTruthTier === CONVERSATION_TIERS.COLD).length;
    const irrelCount = rows.filter((r) => r.groundTruthTier === CONVERSATION_TIERS.IRRELEVANT).length;

    expect(hotCount).toBe(25);
    expect(warmCount).toBe(25);
    expect(coldCount).toBe(25);
    expect(irrelCount).toBe(25);
  });

  it('chạy hàm chấm điểm và in bảng Precision/Recall, đạt tiêu chuẩn nghiệm thu cho Mức Quan Tâm Cao (HOT)', async () => {
    const csvPath = path.resolve(__dirname, '../../benchmark/dataset-conversations-100.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvContent);

    const tiers: ConversationTier[] = [
      CONVERSATION_TIERS.HOT,
      CONVERSATION_TIERS.WARM,
      CONVERSATION_TIERS.COLD,
      CONVERSATION_TIERS.IRRELEVANT,
    ];

    const confusionMatrix: Record<ConversationTier, Record<ConversationTier, number>> = {
      HOT: { HOT: 0, WARM: 0, COLD: 0, IRRELEVANT: 0 },
      WARM: { HOT: 0, WARM: 0, COLD: 0, IRRELEVANT: 0 },
      COLD: { HOT: 0, WARM: 0, COLD: 0, IRRELEVANT: 0 },
      IRRELEVANT: { HOT: 0, WARM: 0, COLD: 0, IRRELEVANT: 0 },
    };

    const ambiguityResolver = new HeuristicAmbiguityResolver();

    for (const row of rows) {
      const baseResult = scoreConversation(
        row.messages,
        benchmarkRules,
        thresholdConfig,
        [],
        row.daysInactive
      );

      let finalTier = baseResult.tier;
      let finalScore = baseResult.score;

      const ambiguityRes = await ambiguityResolver.resolve(
        row.messages,
        baseResult,
        thresholdConfig,
        row.daysInactive
      );
      if (ambiguityRes.isAmbiguous && ambiguityRes.adjustedTier) {
        finalTier = ambiguityRes.adjustedTier;
        finalScore = ambiguityRes.adjustedScore ?? finalScore;
      }

      confusionMatrix[row.groundTruthTier][finalTier]++;
    }

    // Tính metrics
    const metrics = tiers.map((tier) => {
      const tp = confusionMatrix[tier][tier];
      let fp = 0;
      let fn = 0;
      let totalActual = 0;
      let totalPred = 0;

      for (const other of tiers) {
        totalActual += confusionMatrix[tier][other];
        totalPred += confusionMatrix[other][tier];
        if (other !== tier) {
          fn += confusionMatrix[tier][other];
          fp += confusionMatrix[other][tier];
        }
      }

      const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
      const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return { tier, tp, fp, fn, totalActual, totalPred, precision, recall, f1 };
    });

    const hotMetric = metrics.find((m) => m.tier === CONVERSATION_TIERS.HOT)!;

    console.log('\n=== BẢNG KẾT QUẢ ĐÁNH GIÁ 100 HỘI THOẠI KHÁCH HÀNG TIỀM NĂNG ===');
    console.table(
      metrics.map((m) => ({
        Tier: m.tier,
        'Mẫu thực tế': m.totalActual,
        'Dự đoán': m.totalPred,
        TP: m.tp,
        FP: m.fp,
        FN: m.fn,
        'Precision (%)': m.precision.toFixed(1) + '%',
        'Recall (%)': m.recall.toFixed(1) + '%',
        'F1 (%)': m.f1.toFixed(1) + '%',
      }))
    );

    // Tiêu chuẩn nghiệm thu:
    // Precision của HOT >= 90% (tránh gọi nhầm lead không tiềm năng)
    expect(hotMetric.precision).toBeGreaterThanOrEqual(90);
    // Recall của HOT >= 90% (không bỏ sót khách muốn mua / đăng ký)
    expect(hotMetric.recall).toBeGreaterThanOrEqual(90);
    // F1 của HOT >= 90%
    expect(hotMetric.f1).toBeGreaterThanOrEqual(90);
  });
});
