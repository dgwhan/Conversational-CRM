import type { LegalDocument } from '../types/legal.types.js';
import { ORGANIZATION_INFO } from './organization.js';

export const PRIVACY_POLICY_DATA: LegalDocument = {
  title: 'Chính sách bảo mật thông tin',
  subtitle:
    'Cam kết bảo vệ dữ liệu cá nhân của ứng viên, học viên và nhân sự vận hành trên nền tảng PolarisX Conversational CRM',
  version: '1.0.0',
  effectiveDate: '01/01/2026',
  lastUpdated: '10/11/2026',
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
      description: 'Chỉ thu thập tin nhắn và thông tin từ Zalo, Facebook Fanpage và tệp nhập liệu nhằm phục vụ tư vấn tuyển sinh.',
    },
    {
      iconName: 'lock',
      title: 'Bảo mật đa tầng',
      description: 'Mã hóa truyền tải HTTPS/TLS, băm mật khẩu bảo mật, kiểm soát truy cập RBAC và bảo vệ BOLA/IDOR.',
    },
    {
      iconName: 'user-check',
      title: 'Toàn quyền kiểm soát',
      description: 'Chủ thể dữ liệu có đầy đủ quyền tra cứu, chỉnh sửa, yêu cầu xóa dữ liệu hoặc rút lại sự đồng ý bất kỳ lúc nào.',
    },
  ],
  sections: [
    {
      id: 'gioi-thieu',
      title: '1. Giới thiệu và phạm vi áp dụng',
      paragraphs: [
        `Chính sách bảo mật này mô tả cách thức ${ORGANIZATION_INFO.name} (sau đây gọi là "chúng tôi", "Ban quản trị") thu thập, lưu trữ, sử dụng và bảo vệ dữ liệu cá nhân khi vận hành nền tảng PolarisX Conversational CRM (sau đây gọi tắt là "Hệ thống" hoặc "Dịch vụ").`,
        'Chính sách này áp dụng đối với hai nhóm chủ thể dữ liệu chính:',
      ],
      list: [
        'Người dùng nội bộ: Cán bộ quản lý, chuyên viên tư vấn tuyển sinh và quản trị viên hệ thống có tài khoản đăng nhập.',
        'Ứng viên / Khách hàng tiềm năng: Người học, phụ huynh và thí sinh gửi tin nhắn hoặc để lại thông tin quan tâm qua các kênh kết nối (Facebook Fanpage, Zalo Official Account, Zalo cá nhân kết nối và tệp dữ liệu nhập thủ công).',
      ],
      note: 'Hệ thống tuân thủ các nguyên tắc chung của pháp luật Việt Nam về an toàn thông tin mạng và quy định về bảo vệ dữ liệu cá nhân (bao gồm tinh thần của Nghị định 13/2023/NĐ-CP).',
    },
    {
      id: 'du-lieu-thu-thap',
      title: '2. Dữ liệu chúng tôi thu thập',
      paragraphs: [
        'Nhằm phục vụ công tác tư vấn tuyển sinh và hỗ trợ người học kịp thời, Hệ thống ghi nhận các nhóm dữ liệu cụ thể sau:',
      ],
      table: {
        headers: ['Nhóm đối tượng', 'Loại dữ liệu thu thập', 'Nguồn phát sinh'],
        rows: [
          [
            'Nhân sự vận hành (Admin / Staff)',
            'Họ và tên, địa chỉ email công vụ, mật khẩu băm (salted hash), vai trò (Role), Telegram Chat ID (nhận cảnh báo SLA).',
            'Được tạo và cấu hình bởi Quản trị viên hệ thống.',
          ],
          [
            'Ứng viên & Khách hàng tiềm năng',
            'Họ tên, số điện thoại, email, định danh Zalo (Zalo ID/OA User ID), định danh Facebook (Page-scoped ID - PSID), nội dung tin nhắn, tệp đính kèm gửi trong cuộc trò chuyện, nhãn ngành học quan tâm và điểm tiềm năng do AI ước tính.',
            'Do ứng viên chủ động cung cấp khi gửi tin nhắn hoặc được tải lên từ tệp danh sách ứng viên (Excel/CSV).',
          ],
          [
            'Dữ liệu kỹ thuật & Nhật ký',
            'Địa chỉ IP, loại trình duyệt, hệ điều hành, thời điểm đăng nhập, lịch sử thao tác điều hướng và cookie phiên làm việc.',
            'Tự động thu thập từ trình duyệt khi truy cập giao diện CRM.',
          ],
        ],
      },
      note: 'Chúng tôi không chủ động thu thập các danh mục dữ liệu cá nhân nhạy cảm (như thông tin tôn giáo, tài chính cá nhân, hồ sơ bệnh án) trừ khi thí sinh tự nguyện đề cập trong nội dung trao đổi tuyển sinh.',
    },
    {
      id: 'muc-dich-xu-ly',
      title: '3. Mục đích xử lý dữ liệu',
      paragraphs: [
        'Toàn bộ thông tin thu thập được chỉ sử dụng cho các mục đích hợp pháp và minh bạch liên quan trực tiếp đến quy trình tuyển sinh và chăm sóc học viên:',
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
            'Phân tích nội dung thắc mắc để gắn nhãn khóa học (Lập trình, Thiết kế, v.v.) và tính điểm tiềm năng phục vụ ưu tiên tư vấn.',
            'Nâng cao hiệu suất',
          ],
          [
            'Phân công tư vấn & Giám sát SLA',
            'Tự động phân bổ ứng viên cho tư vấn viên theo thuật toán vòng tròn (Round-robin) và kích hoạt bộ đếm thời gian phản hồi.',
            'Vận hành dịch vụ',
          ],
          [
            'Cảnh báo tức thời qua Telegram/Email',
            'Gửi thông báo đến chuyên viên phụ trách khi có tin nhắn mới hoặc khi sắp vượt quá ngưỡng thời gian cam kết phản hồi (SLA).',
            'Quản trị chất lượng',
          ],
          [
            'Báo cáo & Phân tích tổng hợp',
            'Xây dựng các biểu đồ thống kê xu hướng tuyển sinh, tỷ lệ chuyển đổi ngành học và đo lường hiệu quả các kênh truyền thông.',
            'Chiến lược đào tạo',
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
        'Sự đồng ý của người dùng: Ứng viên chủ động nhắn tin vào trang Fanpage/Zalo OA hoặc điền biểu mẫu tư vấn tuyển sinh biểu thị sự đồng ý để đơn vị liên hệ trao đổi thông tin khóa học.',
        'Thực hiện thỏa thuận tư vấn: Xử lý dữ liệu cần thiết nhằm đáp ứng nguyện vọng tìm hiểu chương trình đào tạo, học bổng và thủ tục nhập học của thí sinh.',
        'Nghĩa vụ pháp lý của cơ sở đào tạo: Lưu trữ hồ sơ tuyển sinh và kế toán theo đúng các quy chuẩn quản lý giáo dục hiện hành tại Việt Nam.',
        'Lợi ích chính đáng: Nâng cao chất lượng phục vụ, ngăn chặn gian lận và tối ưu hóa thời gian chờ đợi của người học.',
      ],
    },
    {
      id: 'chia-se-ben-thu-ba',
      title: '5. Chia sẻ dữ liệu với bên thứ ba',
      paragraphs: [
        'Chúng tôi cam kết không bán, không cho thuê và không thương mại hóa dữ liệu cá nhân của người học dưới bất kỳ hình thức nào. Dữ liệu chỉ được trao đổi với các đối tác kỹ thuật hạ tầng trong phạm vi tối cần thiết:',
      ],
      list: [
        'Nền tảng Meta (Facebook Graph API) & Zalo (Zalo OpenAPI): Đồng bộ tin nhắn hai chiều giữa khách hàng và Hộp thư hội thoại CRM.',
        'Nền tảng Telegram: Gửi tin nhắn bot cảnh báo SLA tới tài khoản nội bộ của nhân viên tư vấn.',
        'Nhà cung cấp hạ tầng máy chủ & cơ sở dữ liệu: Các trung tâm dữ liệu đạt chuẩn bảo mật để lưu trữ mã nguồn và cơ sở dữ liệu có mã hóa.',
        'Cơ quan nhà nước có thẩm quyền: Chỉ cung cấp dữ liệu khi có văn bản yêu cầu chính thức theo quy định của pháp luật Việt Nam.',
      ],
      note: 'Mọi bên thứ ba tham gia cung cấp dịch vụ kỹ thuật đều chịu ràng buộc bởi các cam kết bảo mật nghiêm ngặt và không được phép sử dụng dữ liệu cho mục đích riêng.',
    },
    {
      id: 'luu-tru-thoi-han',
      title: '6. Lưu trữ và thời hạn lưu giữ',
      paragraphs: [
        'Dữ liệu được lưu trữ trên hệ thống máy chủ an toàn với thời hạn lưu giữ phụ thuộc vào tính chất của từng loại thông tin:',
      ],
      table: {
        headers: ['Loại thông tin', 'Thời hạn lưu trữ tiêu chuẩn', 'Hành động khi hết hạn'],
        rows: [
          [
            'Nội dung tin nhắn hội thoại',
            '12 đến 24 tháng kể từ lần tương tác gần nhất',
            'Lưu trữ nén ngoại tuyến (Archive) hoặc xóa vĩnh viễn',
          ],
          [
            'Hồ sơ ứng viên đã nhập học',
            'Theo niên khóa đào tạo và quy chế lưu trữ học bạ giáo dục',
            'Chuyển sang hệ thống Quản lý Đào tạo chính quy',
          ],
          [
            'Hồ sơ ứng viên không theo học',
            'Tối đa 12 tháng kể từ khi kết thúc đợt tuyển sinh',
            'Ẩn danh hóa (Anonymization) phục vụ nghiên cứu thống kê',
          ],
          [
            'Tài khoản nhân sự đã nghỉ việc',
            'Khóa truy cập ngay lập tức; giữ nhật ký tối thiểu 6 tháng',
            'Thu hồi toàn bộ phiên đăng nhập và xóa token',
          ],
          [
            'Nhật ký hệ thống (Audit Logs)',
            'Tối thiểu 12 tháng phục vụ đối soát an toàn thông tin',
            'Tự động làm sạch định kỳ theo chính sách xoay vòng log',
          ],
        ],
      },
    },
    {
      id: 'bao-mat-du-lieu',
      title: '7. Các biện pháp bảo mật kỹ thuật',
      paragraphs: [
        'PolarisX Conversational CRM áp dụng các chuẩn mực bảo mật tiên tiến nhằm đảm bảo tính toàn vẹn và bí mật của dữ liệu:',
      ],
      list: [
        'Mã hóa truyền tải (In-transit Encryption): Toàn bộ lưu lượng giữa trình duyệt và máy chủ được mã hóa qua giao thức HTTPS với chứng chỉ TLS 1.3.',
        'Bảo mật mật khẩu: Sử dụng thuật toán băm mật khẩu một chiều mạnh mẽ (bcrypt với chuỗi salt ngẫu nhiên), đảm bảo không ai có thể giải mã được mật khẩu gốc.',
        'Quản lý phiên đăng nhập: Áp dụng JSON Web Token (JWT) có thời hạn ngắn, kèm cơ chế xoay vòng Refresh Token (Token Rotation) giúp ngăn chặn đánh cắp phiên.',
        'Kiểm soát truy cập dựa trên vai trò (RBAC): Phân tách rành mạch quyền hạn giữa Quản trị viên (Admin) và Tư vấn viên (Staff), ngăn chặn nhân viên xem các dữ liệu vượt quyền.',
        'Phòng vệ Broken Object Level Authorization (BOLA/IDOR): Mọi truy vấn theo mã định danh (Workspace ID, Conversation ID) đều qua bộ kiểm tra quyền sở hữu nghiêm ngặt trước khi trả về dữ liệu.',
        'Sao lưu dữ liệu định kỳ: Cơ sở dữ liệu được sao lưu tự động hàng ngày và lưu trữ tại các vùng biệt lập phòng ngừa sự cố.',
      ],
    },
    {
      id: 'quyen-chu-the',
      title: '8. Quyền của chủ thể dữ liệu',
      paragraphs: [
        'Căn cứ các nguyên tắc bảo vệ quyền riêng tư, mọi ứng viên và nhân sự đều có các quyền hợp pháp đối với dữ liệu của mình:',
      ],
      list: [
        'Quyền được biết & Truy cập: Yêu cầu xác nhận về việc dữ liệu của mình có đang được xử lý hay không và xin bản sao dữ liệu.',
        'Quyền chỉnh sửa: Yêu cầu cập nhật, điều chỉnh số điện thoại, email hoặc các thông tin cá nhân chưa chính xác.',
        'Quyền yêu cầu xóa dữ liệu: Yêu cầu xóa bỏ hồ sơ và lịch sử hội thoại khi không còn nhu cầu tìm hiểu khóa học.',
        'Quyền hạn chế hoặc phản đối xử lý: Yêu cầu ngừng gọi điện tư vấn hoặc ngừng nhận tin nhắn chăm sóc tự động.',
        'Quyền rút lại sự đồng ý: Rút lại sự đồng ý đã cấp trước đó mà không ảnh hưởng đến tính hợp pháp của các hoạt động xử lý trước thời điểm rút.',
      ],
      paragraphsAfter: [
        `Để thực thi các quyền trên, chủ thể dữ liệu có thể gửi email bằng văn bản đến địa chỉ chuyên trách: ${ORGANIZATION_INFO.dpoEmail} hoặc ${ORGANIZATION_INFO.contactEmail}. Chúng tôi cam kết phản hồi và xử lý yêu cầu trong vòng tối đa 72 giờ làm việc.`,
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
      title: '10. Dữ liệu của người chưa thành niên (Học sinh)',
      paragraphs: [
        'Trong hoạt động tuyển sinh các chương trình đào tạo cao đẳng, đại học và kỹ năng nghề, đối tượng tìm hiểu có thể bao gồm học sinh THPT dưới 18 tuổi.',
        'Đối với nhóm đối tượng này, chúng tôi chỉ thu thập thông tin cơ bản liên quan đến định hướng học tập và khuyến khích có sự đồng hành, đồng thuận của cha mẹ hoặc người giám hộ hợp pháp trong quá trình đăng ký nhập học chính thức.',
      ],
    },
    {
      id: 'chuyen-du-lieu-quoc-te',
      title: '11. Lưu trữ và chuyển dữ liệu quốc tế',
      paragraphs: [
        'Cơ sở dữ liệu chính của PolarisX CRM được ưu tiên đặt tại các trung tâm dữ liệu nội địa Việt Nam.',
        'Trong trường hợp sử dụng các dịch vụ đám mây toàn cầu (như máy chủ sao lưu hoặc dịch vụ gửi email chuyên nghiệp), dữ liệu chỉ được truyền qua các kênh mã hóa chuẩn quốc tế và đáp ứng các tiêu chuẩn an ninh tương đương.',
      ],
    },
    {
      id: 'su-co-du-lieu',
      title: '12. Quy trình ứng phó và thông báo sự cố dữ liệu',
      paragraphs: [
        'Trong trường hợp phát hiện bất kỳ sự cố an ninh mạng nào có nguy cơ ảnh hưởng đến tính toàn vẹn hoặc bảo mật của dữ liệu cá nhân, Ban quản trị sẽ kích hoạt quy trình ứng cứu khẩn cấp:',
      ],
      list: [
        'Cô lập vùng bị ảnh hưởng và ngăn chặn nguy cơ rò rỉ trong vòng 04 giờ kể từ khi phát hiện.',
        'Báo cáo cho cơ quan quản lý nhà nước có thẩm quyền theo quy định của pháp luật.',
        'Gửi thông báo công khai hoặc gửi thư trực tiếp cho các chủ thể dữ liệu bị ảnh hưởng kèm theo khuyến nghị phòng ngừa rủi ro.',
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
