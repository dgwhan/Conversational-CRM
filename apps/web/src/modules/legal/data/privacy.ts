import type { LegalDocument } from '../types/legal.types.js';
import { ORGANIZATION_INFO } from './organization.js';

export const PRIVACY_POLICY_DATA: LegalDocument = {
  title: 'Chính sách bảo mật thông tin',
  subtitle:
    'Cách PolarisX xử lý dữ liệu trong tài khoản, workspace, hội thoại đa kênh và quy trình chăm sóc khách hàng của doanh nghiệp.',
  version: '1.0.0',
  effectiveDate: '01/11/2026',
  lastUpdated: '17/11/2026',
  documentType: 'privacy',
  quickSummary: [
    {
      iconName: 'shield',
      title: 'Không bán dữ liệu',
      description: 'Chúng tôi cam kết không kinh doanh hoặc chuyển giao thông tin cá nhân cho bên thứ ba vì mục đích tiếp thị.',
    },
    {
      iconName: 'database',
      title: 'Xử lý đa kênh hợp nhất',
      description: 'Xử lý dữ liệu từ các kênh doanh nghiệp kết nối và thông tin được đơn vị sử dụng chủ động nhập vào hệ thống.',
    },
    {
      iconName: 'lock',
      title: 'Bảo mật đa tầng',
      description: 'Áp dụng các biện pháp bảo vệ tài khoản, kiểm soát truy cập và bảo vệ dữ liệu trong quá trình vận hành dịch vụ.',
    },
    {
      iconName: 'user-check',
      title: 'Thực hiện quyền dữ liệu',
      description: 'Chủ thể dữ liệu có thể gửi yêu cầu liên quan đến dữ liệu của mình theo quy định áp dụng.',
    },
  ],
  sections: [
    {
      id: 'gioi-thieu',
      title: '1. Giới thiệu và phạm vi áp dụng',
      paragraphs: [
        `Chính sách này mô tả cách ${ORGANIZATION_INFO.name} ("PolarisX", "chúng tôi") xử lý dữ liệu khi cung cấp và vận hành PolarisX Conversational CRM ("Hệ thống"). Nội dung tập trung vào các hoạt động thực tế như tạo tài khoản, tham gia workspace, kết nối kênh nhắn tin, quản lý hội thoại và theo dõi hiệu suất chăm sóc khách hàng.`,
        'Dữ liệu trong Hệ thống thường liên quan đến hai nhóm:',
      ],
      list: [
        'Người dùng dịch vụ: Cá nhân đăng ký tài khoản hoặc tham gia workspace với vai trò Owner, Manager hoặc Staff. Vai trò được gán riêng theo từng workspace; tài khoản không có role toàn cục.',
        'Khách hàng và người liên hệ của doanh nghiệp: Cá nhân nhắn tin qua kênh đã kết nối hoặc có thông tin được doanh nghiệp nhập vào CRM.',
      ],
      note: 'Doanh nghiệp sử dụng Hệ thống quyết định mục đích chăm sóc khách hàng và dữ liệu được đưa vào workspace. PolarisX xử lý dữ liệu cần thiết để cung cấp, bảo vệ và hỗ trợ dịch vụ theo cấu hình của doanh nghiệp.',
    },
    {
      id: 'du-lieu-thu-thap',
      title: '2. Dữ liệu chúng tôi thu thập',
      paragraphs: [
        'Tùy theo cách đơn vị sử dụng cấu hình và vận hành dịch vụ, hệ thống có thể xử lý các nhóm dữ liệu sau:',
      ],
      table: {
        headers: ['Nhóm đối tượng', 'Loại dữ liệu thu thập', 'Nguồn phát sinh'],
        rows: [
          [
            'Tài khoản thành viên workspace',
            'Họ tên, email, số điện thoại, thông tin xác thực được lưu dưới dạng hash, phiên đăng nhập và thông tin workspace. Owner, Manager hoặc Staff được gán theo từng workspace; tài khoản tự đăng ký không có role riêng.',
            'Tài khoản do cá nhân đăng ký; Owner workspace mời tài khoản tham gia và gán vai trò.',
          ],
          [
            'Khách hàng & Người liên hệ',
            'Thông tin nhận diện và liên hệ, định danh trên kênh tích hợp, nội dung hội thoại và tệp đính kèm, nhãn phân loại, lịch sử tương tác và điểm ưu tiên nếu tính năng này được bật.',
            'Phát sinh từ tin nhắn/kênh doanh nghiệp kết nối hoặc do doanh nghiệp nhập, đồng bộ vào workspace.',
          ],
          [
            'Dữ liệu kỹ thuật & Nhật ký',
            'Thông tin thiết bị và trình duyệt, địa chỉ IP, thời điểm đăng nhập, nhật ký thao tác cần thiết cho vận hành và cookie/định danh phiên.',
            'Tự động thu thập từ trình duyệt khi truy cập giao diện CRM.',
          ],
        ],
      },
      note: 'Đơn vị sử dụng cần cân nhắc dữ liệu đưa vào hệ thống, giới hạn ở phạm vi cần thiết cho mục đích đã thông báo và có căn cứ xử lý phù hợp đối với dữ liệu nhạy cảm.',
    },
    {
      id: 'muc-dich-xu-ly',
      title: '3. Mục đích xử lý dữ liệu',
      paragraphs: [
        'Dữ liệu được xử lý cho các mục đích vận hành dịch vụ và quy trình chăm sóc khách hàng do đơn vị sử dụng thiết lập:',
      ],
      table: {
        headers: ['Mục đích xử lý', 'Hoạt động cụ thể trong Hệ thống', 'Mức độ ưu tiên'],
        rows: [
          [
            'Hội thoại & Phản hồi trực tiếp',
            'Gom và hiển thị tin nhắn từ Facebook Fanpage và Zalo OA về Hộp thư tập trung để tư vấn viên phản hồi nhanh chóng.',
            'Thiết yếu',
          ],
          [
            'Phân loại & Chấm điểm tiềm năng (AI)',
            'Phân loại nội dung hội thoại theo nhu cầu, sản phẩm hoặc dịch vụ và hỗ trợ xác định mức độ ưu tiên chăm sóc.',
            'Nâng cao hiệu suất',
          ],
          [
            'Phân công tư vấn & Giám sát SLA',
            'Phân bổ hội thoại cho nhân sự phụ trách theo cấu hình workspace và theo dõi thời gian phản hồi.',
            'Vận hành dịch vụ',
          ],
          [
            'Cảnh báo tức thời qua Telegram/Email',
            'Gửi thông báo đến chuyên viên phụ trách khi có tin nhắn mới hoặc khi sắp vượt quá ngưỡng thời gian cam kết phản hồi (SLA).',
            'Quản trị chất lượng',
          ],
          [
            'Báo cáo & Phân tích tổng hợp',
            'Tổng hợp hiệu suất hội thoại, cơ hội bán hàng và hiệu quả các kênh phục vụ hoạt động quản trị.',
            'Quản trị kinh doanh',
          ],
          [
            'An toàn & Kiểm toán bảo mật',
            'Lưu vết nhật ký truy cập (Audit logs) để phát hiện và ngăn chặn các hành vi xâm nhập trái phép hoặc đánh cắp dữ liệu.',
            'An ninh mạng',
          ],
        ],
      },
    },
    {
      id: 'co-so-phap-ly',
      title: '4. Cơ sở pháp lý và sự đồng ý',
      paragraphs: [
        'Việc xử lý dữ liệu trên PolarisX Conversational CRM được thực hiện dựa trên các căn cứ hợp pháp sau:',
      ],
      list: [
        'Sự đồng ý hoặc căn cứ xử lý phù hợp khác: Đơn vị sử dụng có trách nhiệm xác định căn cứ xử lý dữ liệu cho từng mục đích và thông báo cho chủ thể dữ liệu theo quy định áp dụng.',
        'Cung cấp dịch vụ: Xử lý dữ liệu cần thiết để tiếp nhận, quản lý và phản hồi yêu cầu của khách hàng hoặc thực hiện thỏa thuận với khách hàng.',
        'Nghĩa vụ pháp lý: Lưu trữ hoặc cung cấp dữ liệu khi cần thiết để thực hiện nghĩa vụ theo quy định pháp luật.',
        'Vận hành và bảo vệ dịch vụ: Duy trì chất lượng hỗ trợ, ngăn chặn gian lận và bảo đảm an toàn hệ thống trong phạm vi phù hợp.',
      ],
    },
    {
      id: 'chia-se-ben-thu-ba',
      title: '5. Chia sẻ dữ liệu với bên thứ ba',
      paragraphs: [
        'Dữ liệu cá nhân không được bán hoặc sử dụng cho mục đích tiếp thị riêng. Dữ liệu có thể được chia sẻ trong phạm vi cần thiết để cung cấp dịch vụ hoặc khi pháp luật yêu cầu:',
      ],
      list: [
        'Nền tảng Meta (Facebook Graph API) & Zalo (Zalo OpenAPI): Đồng bộ tin nhắn hai chiều giữa khách hàng và Hộp thư hội thoại CRM.',
        'Nền tảng Telegram: Gửi tin nhắn bot cảnh báo SLA tới tài khoản nội bộ của nhân viên tư vấn.',
        'Nhà cung cấp hạ tầng và dịch vụ kỹ thuật: Chỉ xử lý dữ liệu trong phạm vi cần thiết để lưu trữ, truyền tải, giám sát hoặc hỗ trợ Hệ thống theo hợp đồng và cấu hình triển khai.',
        'Cơ quan nhà nước có thẩm quyền: Chỉ cung cấp dữ liệu khi có văn bản yêu cầu chính thức theo quy định của pháp luật Việt Nam.',
      ],
      note: 'Khi doanh nghiệp kết nối Meta, Zalo, Telegram hoặc nhà cung cấp khác, việc xử lý trên nền tảng đó còn tuân theo chính sách và điều khoản riêng của bên thứ ba.',
    },
    {
      id: 'luu-tru-thoi-han',
      title: '6. Lưu trữ và thời hạn lưu giữ',
      paragraphs: [
        'Thời gian lưu giữ phụ thuộc vào mục đích sử dụng, trạng thái workspace, cấu hình dịch vụ và nghĩa vụ pháp lý. Doanh nghiệp cần rà soát dữ liệu CRM, hội thoại và thành viên theo nhu cầu thực tế:',
      ],
      table: {
        headers: ['Loại thông tin', 'Thời hạn lưu trữ tiêu chuẩn', 'Hành động khi hết hạn'],
        rows: [
          [
            'Nội dung tin nhắn hội thoại',
            'Trong thời gian cần thiết để vận hành workspace hoặc theo thỏa thuận dịch vụ',
            'Doanh nghiệp yêu cầu xử lý/xóa theo quy trình hỗ trợ; có thể lưu phần cần thiết để tuân thủ pháp luật',
          ],
          [
            'Hồ sơ khách hàng đang được chăm sóc',
            'Theo mục đích chăm sóc khách hàng và thỏa thuận giữa doanh nghiệp với PolarisX',
            'Doanh nghiệp rà soát và yêu cầu xóa khi không còn mục đích lưu giữ',
          ],
          [
            'Hồ sơ khách hàng không còn hoạt động',
            'Được rà soát định kỳ theo mục đích và thỏa thuận với đơn vị sử dụng',
            'Xóa hoặc ẩn danh khi không còn cần thiết, trừ trường hợp phải lưu theo luật',
          ],
          [
            'Tài khoản nhân sự đã nghỉ việc',
            'Trong phạm vi cần thiết cho an toàn, kiểm toán và nghĩa vụ pháp lý',
            'Doanh nghiệp gỡ thành viên khỏi workspace; phiên truy cập được thu hồi theo quy trình hệ thống',
          ],
          [
            'Nhật ký hệ thống (Audit Logs)',
            'Theo chính sách bảo mật và thời hạn cần thiết cho mục đích vận hành',
            'Xóa hoặc ẩn danh theo quy trình lưu giữ dữ liệu áp dụng',
          ],
        ],
      },
    },
    {
      id: 'bao-mat-du-lieu',
      title: '7. Các biện pháp bảo mật kỹ thuật',
      paragraphs: [
        'Các biện pháp dưới đây gắn với cách Hệ thống xác thực người dùng và phân tách hoạt động giữa các workspace:',
      ],
      list: [
        'Bảo vệ thông tin xác thực: Mật khẩu được băm bằng Argon2; access token có thời hạn, còn refresh token được lưu dưới dạng hash và xoay vòng khi làm mới phiên.',
        'Phân quyền theo workspace: Owner, Manager và Staff chỉ có quyền tương ứng trong workspace mà họ tham gia; tài khoản không được cấp quyền quản trị toàn cục.',
        'Kiểm tra phạm vi dữ liệu: Các thao tác với workspace và hội thoại được kiểm tra quyền thành viên để hạn chế truy cập chéo giữa các workspace.',
        'Nhật ký vận hành: Ghi nhận các sự kiện quản trị và thay đổi quyền cần thiết cho hỗ trợ, truy vết và rà soát sự cố.',
        'Kết nối kênh: Token và thông tin tích hợp chỉ được sử dụng để duy trì kết nối, đồng bộ dữ liệu và gửi thông báo theo cấu hình doanh nghiệp.',
        'Bảo vệ hạ tầng: PolarisX áp dụng biện pháp kỹ thuật và vận hành phù hợp để bảo vệ hệ thống; phạm vi mã hóa, sao lưu và thời hạn lưu log phụ thuộc cấu hình hạ tầng triển khai.',
      ],
    },
    {
      id: 'quyen-chu-the',
      title: '8. Quyền của chủ thể dữ liệu',
      paragraphs: [
        'Chủ thể dữ liệu có thể thực hiện các quyền của mình theo điều kiện, trình tự và giới hạn quy định bởi pháp luật hiện hành:',
      ],
      list: [
        'Quyền được biết & Truy cập: Yêu cầu xác nhận về việc dữ liệu của mình có đang được xử lý hay không và xin bản sao dữ liệu.',
        'Quyền chỉnh sửa: Yêu cầu cập nhật, điều chỉnh số điện thoại, email hoặc các thông tin cá nhân chưa chính xác.',
        'Quyền yêu cầu xóa dữ liệu: Gửi yêu cầu xóa dữ liệu cá nhân trong các trường hợp và theo trình tự pháp luật quy định.',
        'Quyền hạn chế hoặc phản đối xử lý: Gửi yêu cầu liên quan đến việc tiếp tục xử lý dữ liệu theo quyền được pháp luật quy định.',
        'Quyền rút lại sự đồng ý: Rút lại sự đồng ý đã cấp trước đó mà không ảnh hưởng đến tính hợp pháp của các hoạt động xử lý trước thời điểm rút.',
      ],
      paragraphsAfter: [
        `Để gửi yêu cầu, chủ thể dữ liệu có thể liên hệ qua ${ORGANIZATION_INFO.dpoEmail} hoặc ${ORGANIZATION_INFO.contactEmail}. Yêu cầu sẽ được xác minh và xử lý theo quy trình cùng thời hạn pháp luật áp dụng.`,
      ],
    },
    {
      id: 'cookie-tracking',
      title: '9. Cookie và công nghệ lưu trữ trình duyệt',
      paragraphs: [
        'Giao diện web của Hệ thống sử dụng Cookie kỹ thuật và LocalStorage cho các mục đích thiết yếu:',
      ],
      list: [
        'Duy trì phiên đăng nhập bảo mật (Session Token).',
        'Ghi nhớ tùy chọn giao diện người dùng (chế độ Sáng/Tối - Light/Dark Theme).',
        'Lưu tạm bộ nhớ đệm (Cache) giúp tăng tốc độ tải trang trên các thiết bị cấu hình thấp.',
      ],
      note: 'Chúng tôi không sử dụng cookie theo dõi quảng cáo chéo (cross-site tracking cookies) của bên thứ ba để nhắm mục tiêu thương mại ngoài phạm vi dịch vụ.',
    },
    {
      id: 'tre-em',
      title: '10. Dữ liệu cá nhân của người chưa thành niên',
      paragraphs: [
        'Dữ liệu của người chưa thành niên chỉ nên được đưa vào hệ thống khi cần thiết cho mục đích đã xác định và có căn cứ xử lý phù hợp.',
        'Đơn vị sử dụng có trách nhiệm áp dụng biện pháp bảo vệ phù hợp, cung cấp thông tin cần thiết và thực hiện yêu cầu của cha mẹ, người giám hộ hoặc chủ thể dữ liệu theo quy định hiện hành.',
      ],
    },
    {
      id: 'chuyen-du-lieu-quoc-te',
      title: '11. Lưu trữ và chuyển dữ liệu quốc tế',
      paragraphs: [
        'Dữ liệu có thể được lưu trữ hoặc xử lý tại vị trí do nhà cung cấp hạ tầng dịch vụ sử dụng, bao gồm ngoài lãnh thổ Việt Nam nếu có.',
        'Việc chuyển dữ liệu ra nước ngoài (nếu phát sinh) cần được đơn vị vận hành đánh giá và thực hiện theo yêu cầu pháp luật hiện hành.',
      ],
    },
    {
      id: 'su-co-du-lieu',
      title: '12. Quy trình ứng phó và thông báo sự cố dữ liệu',
      paragraphs: [
        'Khi phát hiện sự cố có nguy cơ ảnh hưởng đến dữ liệu trong Hệ thống, PolarisX sẽ phối hợp khoanh vùng, giảm thiểu tác động và thông báo cho doanh nghiệp liên quan theo thỏa thuận và quy định áp dụng. Doanh nghiệp thông báo cho khách hàng của mình khi có nghĩa vụ:',
      ],
      list: [
        'Khoanh vùng sự cố, hạn chế truy cập trái phép và áp dụng biện pháp giảm thiểu ảnh hưởng.',
        'Thông báo cho cơ quan có thẩm quyền và các bên liên quan trong trường hợp pháp luật yêu cầu.',
        'Cung cấp thông tin cần thiết cho chủ thể dữ liệu bị ảnh hưởng theo quy định áp dụng.',
      ],
    },
    {
      id: 'thay-doi-chinh-sach',
      title: '13. Thay đổi và cập nhật chính sách',
      paragraphs: [
        'Chúng tôi có thể cập nhật nội dung Chính sách bảo mật này theo thời gian nhằm phản ánh các cải tiến về mặt công nghệ hoặc sự thay đổi của khung pháp lý.',
        'Mọi thay đổi quan trọng sẽ được thông báo rõ ràng trên giao diện đăng nhập CRM hoặc cập nhật ngày "Cập nhật lần cuối" ở đầu văn bản này.',
      ],
    },
    {
      id: 'thong-tin-lien-he',
      title: '14. Thông tin liên hệ về quyền riêng tư',
      paragraphs: [
        'Nếu bạn có bất kỳ thắc mắc, phản ánh hoặc yêu cầu khiếu nại nào liên quan đến việc bảo vệ dữ liệu cá nhân, vui lòng liên hệ trực tiếp với Bộ phận Bảo vệ Dữ liệu của chúng tôi:',
      ],
      list: [
        `Đơn vị quản lý: ${ORGANIZATION_INFO.name}`,
        `Địa chỉ tiếp nhận: ${ORGANIZATION_INFO.address}`,
        `Email liên hệ chung: ${ORGANIZATION_INFO.contactEmail}`,
        `Email phụ trách Bảo vệ dữ liệu (DPO): ${ORGANIZATION_INFO.dpoEmail}`,
        `Hotline hỗ trợ kỹ thuật: ${ORGANIZATION_INFO.phone}`,
      ],
    },
  ],
};
