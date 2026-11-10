import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PRIVACY_POLICY_DATA } from '../data/privacy.js';
import { TERMS_OF_SERVICE_DATA } from '../data/terms.js';
import { LegalToc } from '../components/LegalToc.js';

describe('Legal Data Integrity', () => {
  it('Chính sách bảo mật (Privacy Policy) có tất cả section id là duy nhất và hợp lệ', () => {
    const ids = PRIVACY_POLICY_DATA.sections.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBeGreaterThan(0);
    expect(uniqueIds.size).toBe(ids.length);

    // Không có id nào chứa khoảng trắng hoặc ký tự đặc biệt
    ids.forEach((id) => {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it('Điều khoản dịch vụ (Terms of Service) có tất cả section id là duy nhất và hợp lệ', () => {
    const ids = TERMS_OF_SERVICE_DATA.sections.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBeGreaterThan(0);
    expect(uniqueIds.size).toBe(ids.length);

    // Không có id nào chứa khoảng trắng hoặc ký tự đặc biệt
    ids.forEach((id) => {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe('LegalToc Component', () => {
  it('Hiển thị đầy đủ các mục trong Table of Contents tương ứng với số lượng section', () => {
    render(
      <LegalToc
        sections={PRIVACY_POLICY_DATA.sections}
        activeId={PRIVACY_POLICY_DATA.sections[0].id}
      />
    );

    // Kiểm tra trong navigation desktop
    const nav = screen.getByRole('navigation', { name: /Mục lục văn bản pháp lý/i });
    expect(nav).toBeDefined();

    // Mỗi section phải xuất hiện tên tiêu đề tương ứng trong TOC
    PRIVACY_POLICY_DATA.sections.forEach((section) => {
      const elements = screen.getAllByText(section.title);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
