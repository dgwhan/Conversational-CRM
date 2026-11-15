/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SearchableSelect, normalizeVietnamese } from './SearchableSelect.js';

describe('SearchableSelect component', () => {
  afterEach(() => {
    cleanup();
  });

  it('normalizes Vietnamese accents correctly including letter d/đ', () => {
    expect(normalizeVietnamese('Đang quan tâm')).toBe('dang quan tam');
    expect(normalizeVietnamese('HỌC PHÍ & ƯU ĐÃI')).toBe('hoc phi & uu dai');
    expect(normalizeVietnamese('Tiềm năng cao')).toBe('tiem nang cao');
  });

  it('renders trigger input with placeholder when no value is provided', () => {
    render(
      <SearchableSelect
        options={[
          { value: '1', label: 'Lựa chọn 1' },
          { value: '2', label: 'Lựa chọn 2' },
        ]}
        placeholder="Chọn nhóm từ khóa..."
      />
    );

    const input = screen.getByPlaceholderText('Chọn nhóm từ khóa...');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('renders trigger input with selected option label without any numbers or badges', () => {
    render(
      <SearchableSelect
        value="opt-2"
        options={[
          { value: 'opt-1', label: 'Nhóm cơ bản' },
          { value: 'opt-2', label: 'Nhóm nâng cao' },
        ]}
      />
    );

    const input = screen.getByDisplayValue('Nhóm nâng cao');
    expect(input).toBeInTheDocument();
  });

  it('filters inline when typing with accent-insensitive Vietnamese matching and selects option', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'hoc-phi', label: 'Học phí' },
      { value: 'bang-cap', label: 'Bằng cấp' },
      { value: 'thoi-gian', label: 'Thời gian' },
    ];

    render(
      <SearchableSelect
        options={options}
        onChange={handleChange}
        placeholder="Tìm nhóm..."
      />
    );

    const input = screen.getByPlaceholderText('Tìm nhóm...');
    // Focus & type without accent: "hoc"
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hoc' } });

    // Should display filtered option "Học phí"
    expect(screen.getByText('Học phí')).toBeInTheDocument();
    expect(screen.queryByText('Bằng cấp')).not.toBeInTheDocument();

    // Click option
    fireEvent.click(screen.getByText('Học phí'));
    expect(handleChange).toHaveBeenCalledWith('hoc-phi');
  });

  it('caps rendering at maxRenderItems (40 items) for 10,000+ items', () => {
    const tenThousandOptions = Array.from({ length: 10000 }, (_, idx) => ({
      value: `key-${idx}`,
      label: `Từ khóa số ${idx + 1}`,
    }));

    render(
      <SearchableSelect
        options={tenThousandOptions}
        placeholder="Tìm từ khóa..."
      />
    );

    const input = screen.getByPlaceholderText('Tìm từ khóa...');
    fireEvent.focus(input);

    const renderedItems = screen.getAllByRole('option');
    expect(renderedItems).toHaveLength(40);
  });

  it('supports clearable button to reset value', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        value="item-1"
        options={[
          { value: 'item-1', label: 'Mục 1' },
          { value: 'item-2', label: 'Mục 2' },
        ]}
        clearable
        onChange={handleChange}
      />
    );

    const clearBtn = screen.getByTitle('Xóa lựa chọn');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('supports non-searchable mode with readonly input and click-to-open', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        value="36"
        options={[
          { value: '12', label: '12 tháng (Chuẩn Khuyến nghị CRM)' },
          { value: '24', label: '24 tháng (2 năm)' },
          { value: '36', label: '36 tháng (3 năm)' },
        ]}
        searchable={false}
        onChange={handleChange}
      />
    );

    const input = screen.getByDisplayValue('36 tháng (3 năm)');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('readonly');

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByText('12 tháng (Chuẩn Khuyến nghị CRM)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('12 tháng (Chuẩn Khuyến nghị CRM)'));

    expect(handleChange).toHaveBeenCalledWith('12');
  });
});
