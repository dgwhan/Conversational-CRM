import type { LegalDocument } from '../types/legal.types.js';
import { ORGANIZATION_INFO } from './organization.js';

export const TERMS_OF_SERVICE_DATA: LegalDocument = {
  title: 'Điều khoản dịch vụ sử dụng',
  subtitle:
    'Quy định quyền hạn, trách nhiệm và nguyên tắc vận hành hệ thống PolarisX Conversational CRM dành cho các đơn vị và người dùng',
  version: '2.4.0',
  effectiveDate: '01/01/2026',
  lastUpdated: '10/11/2026',
  documentType: 'terms',
  quickSummary: [
    {
      iconName: 'file-text',
      title: 'Thỏa thuận pháp lý',
      description: 'Việc đăng nhập và sử dụng hệ thống cấu thành sự chấp thuận đầy đủ toàn bộ các điều khoản được nêu tại đây.',
    },
    {
      iconName: 'database',
      title: 'Sở hữu dữ liệu',
      description: 'Đơn vị sử dụng giữ toàn quyền sở hữu đối với cơ sở dữ liệu học viên, tin nhắn và thông tin khách hàng của mình.',
    },
    {
      iconName: 'scale',
      title: 'Tuân thủ bên thứ ba',
      description: 'Người dùng có nghĩa vụ tuân thủ các chính sách nền tảng của Meta (Facebook), Zalo và Telegram khi kết nối kênh.',
    },
    {
      iconName: 'alert-triangle',
      title: 'Nghiêm cấm lạm dụng',
      description: 'Nghiêm cấm tuyệt đối các hành vi gửi tin nhắn rác (spam), quét dữ liệu trái phép hoặc xâm phạm quyền kiểm soát.',
    },
  ],
  sections: [
    {
      id: 'chap-nhan-dieu-khoan',
      title: '1. Chấp nhận điều khoản',
      paragraphs: [
        `Chào mừng bạn đến với PolarisX Conversational CRM. Bằng việc truy cập, tạo tài khoản hoặc sử dụng bất kỳ tính năng nào thuộc Dịch vụ do ${ORGANIZATION_INFO.name} phát triển và vận hành, bạn xác nhận đã đọc, hiểu rõ và đồng ý bị ràng buộc bởi bản Điều khoản dịch vụ này.`,
        'Nếu bạn đại diện cho một tổ chức giáo dục, trường học hoặc doanh nghiệp, bạn cam kết rằng mình có đầy đủ thẩm quyền pháp lý để ràng buộc tổ chức đó với các điều khoản này.',
      ],
      note: 'Nếu bạn không đồng ý với bất kỳ nội dung nào trong điều khoản, vui lòng ngừng sử dụng Hệ thống ngay lập tức.',
    },
    {
      id: 'dinh-nghia',
      title: '2. Định nghĩa các thuật ngữ',
      paragraphs: [
        'Trong khuôn khổ văn bản này, các thuật ngữ dưới đây được hiểu theo nghĩa tương ứng:',
      ],
      list: [
        'Dịch vụ (Hệ thống / PolarisX CRM): Nền tảng phần mềm quản lý hội thoại đa kênh, tiếp nhận tin nhắn, phân loại lead bằng AI, quản lý phễu tuyển sinh Kanban và báo cáo phân tích.',
        'Đơn vị sử dụng (Khách hàng): Cơ sở đào tạo, trung tâm hoặc doanh nghiệp sở hữu không gian làm việc (Workspace) trên hệ thống.',
        'Quản trị viên (Admin / Owner): Tài khoản có quyền cao nhất trong Workspace, được phép quản lý nhân sự, thiết lập kênh và phân bổ tài nguyên.',
        'Tư vấn viên (Staff): Tài khoản thành viên được cấp quyền truy cập hộp thư hội thoại, trả lời tin nhắn và chăm sóc ứng viên.',
        'Dữ liệu khách hàng: Toàn bộ thông tin, nội dung chat, tệp đính kèm và số điện thoại của ứng viên do Đơn vị tải lên hoặc đồng bộ về hệ thống.',
        'Kênh tích hợp: Các nền tảng nhắn tin bên thứ ba được kết nối gồm Facebook Fanpage, Zalo Official Account (OA), Zalo cá nhân và Telegram Bot.',
      ],
    },
    {
      id: 'tai-khoan-phan-quyen',
      title: '3. Tài khoản và phân quyền sử dụng',
      paragraphs: [
        'Việc quản trị và phân quyền tài khoản phải tuân theo các nguyên tắc an toàn:',
      ],
      list: [
        'Tính chính danh: Mỗi tài khoản người dùng phải gắn liền với một cá nhân xác thực trong tổ chức. Không được chia sẻ một tài khoản cho nhiều nhân viên sử dụng chung.',
        'Trách nhiệm bảo mật thông tin đăng nhập: Người dùng chịu hoàn toàn trách nhiệm duy trì tính bí mật của mật khẩu và các hoạt động phát sinh dưới tài khoản của mình.',
        'Cơ chế phân quyền RBAC: Quản trị viên có nghĩa vụ rà soát và gán đúng vai trò cho nhân viên, định kỳ thu hồi quyền truy cập đối với các nhân sự đã chuyển công tác hoặc nghỉ việc.',
        'Thông báo rủi ro: Khi phát hiện dấu hiệu lộ mật khẩu hoặc tài khoản bị xâm nhập trái phép, người dùng phải thông báo ngay cho Quản trị viên để tiến hành khóa phiên và cấp lại chứng thực.',
      ],
    },
    {
      id: 'quyen-va-nghia-vu',
      title: '4. Quyền và nghĩa vụ của người dùng',
      paragraphs: [
        'Đơn vị và người dùng tham gia sử dụng PolarisX CRM có các quyền và trách nhiệm cụ thể sau:',
      ],
      list: [
        'Quyền sử dụng hợp pháp: Được khai thác đầy đủ các tính năng của Dịch vụ theo đúng phạm vi gói bản quyền hoặc thỏa thuận đã đăng ký.',
        'Trách nhiệm về nội dung: Chịu trách nhiệm pháp lý đối với toàn bộ thông điệp tư vấn, tài liệu quảng bá tuyển sinh và thông tin khóa học gửi tới ứng viên.',
        'Cam kết tính trung thực: Cung cấp thông tin tuyển sinh chính xác, không đưa thông tin sai lệch gây nhầm lẫn cho phụ huynh và học sinh.',
        'Sao lưu định kỳ: Chủ động sao lưu dữ liệu xuất khẩu từ hệ thống theo kế hoạch nội bộ của Đơn vị.',
      ],
    },
    {
      id: 'hanh-vi-nghiem-cam',
      title: '5. Các hành vi bị nghiêm cấm',
      paragraphs: [
        'Khi vận hành và khai thác PolarisX CRM, người dùng tuyệt đối không được thực hiện các hành vi sau:',
      ],
      list: [
        'Phát tán tin nhắn rác (Spam): Gửi tin nhắn tiếp thị hàng loạt vi phạm chính sách chống thư rác của Facebook, Zalo hoặc pháp luật Việt Nam.',
        'Khai thác dữ liệu trái phép (Data Scraping): Sử dụng bot tự động, công cụ trích xuất dữ liệu không qua giao diện được ủy quyền để thu thập thông tin ứng viên.',
        'Xâm phạm kiểm soát an ninh (Bypassing Access Control): Cố tình thao túng mã định danh URL (IDOR/BOLA) nhằm xem lén dữ liệu thuộc về Workspace hoặc tư vấn viên khác.',
        'Tải lên phần mềm độc hại: Truyền tải các tệp tin chứa virus, trojan, mã độc hoặc khai thác lỗ hổng kỹ thuật của hệ thống.',
        'Kỹ nghệ đảo ngược (Reverse Engineering): Dịch ngược, can thiệp mã nguồn hoặc sao chép kiến trúc giao diện nhằm mục đích cạnh tranh không lành mạnh.',
      ],
      note: 'Các hành vi vi phạm có thể dẫn đến việc khóa tài khoản vĩnh viễn không hoàn tiền và chuyển giao hồ sơ cho cơ quan chức năng xử lý theo Luật An ninh mạng.',
    },
    {
      id: 'tich-hop-ben-thu-ba',
      title: '6. Tích hợp kênh bên thứ ba',
      paragraphs: [
        'PolarisX CRM kết nối với các dịch vụ nhắn tin bên ngoài thông qua API chính thức. Khi kích hoạt các kênh này, bạn đồng ý rằng:',
      ],
      list: [
        'Tuân thủ điều khoản đối tác: Bạn phải tuân thủ nghiêm ngặt Điều khoản dịch vụ và Chính sách nền tảng của Meta (Facebook Graph API), VNG (Zalo OpenAPI) và Telegram.',
        'Quyền phê duyệt của bên thứ ba: Việc một Fanpage hoặc Zalo OA bị tạm khóa, hạn chế gửi tin hoặc thay đổi chính sách thu phí từ phía Meta/Zalo thuộc thẩm quyền độc quyền của các nhà cung cấp đó.',
        'Miễn trừ trách nhiệm về gián đoạn bên ngoài: Chúng tôi không chịu trách nhiệm đối với sự cố mất kết nối, độ trễ gửi tin hoặc thay đổi API do các bên thứ ba ban hành.',
      ],
    },
    {
      id: 'so-huu-du-lieu-vai-tro',
      title: '7. Quyền sở hữu dữ liệu và vai trò xử lý',
      paragraphs: [
        'Quyền sở hữu và vai trò của các bên đối với dữ liệu phát sinh trong quá trình vận hành được xác lập rõ ràng:',
      ],
      list: [
        'Chủ sở hữu dữ liệu (Data Owner): Đơn vị sử dụng giữ quyền sở hữu tuyệt đối và toàn diện đối với toàn bộ Dữ liệu khách hàng, danh sách học sinh và nội dung trao đổi.',
        'Bên xử lý dữ liệu (Data Processor): Ban quản trị PolarisX CRM chỉ đóng vai trò là bên cung cấp hạ tầng công nghệ và xử lý dữ liệu thay mặt Đơn vị theo đúng mục đích vận hành CRM.',
        'Cam kết không chiếm dụng: Chúng tôi không sử dụng Dữ liệu khách hàng của Đơn vị cho các mục đích thương mại riêng hoặc chia sẻ cho các đối thủ cạnh tranh.',
      ],
    },
    {
      id: 'so-huu-tri-tue',
      title: '8. Quyền sở hữu trí tuệ',
      paragraphs: [
        `Toàn bộ mã nguồn, cấu trúc cơ sở dữ liệu, giao diện người dùng (UI/UX), đồ họa linh vật (Mascot Cusi), tài liệu hướng dẫn và nhãn hiệu "PolarisX" thuộc quyền sở hữu trí tuệ độc quyền của ${ORGANIZATION_INFO.name}.`,
        'Việc cấp quyền sử dụng phần mềm không đồng nghĩa với việc chuyển giao bất kỳ quyền sở hữu trí tuệ nào cho Đơn vị sử dụng.',
      ],
    },
    {
      id: 'muc-do-san-sang-bao-tri',
      title: '9. Mức độ sẵn sàng của dịch vụ (SLA) và bảo trì',
      paragraphs: [
        'Chúng tôi nỗ lực duy trì Dịch vụ hoạt động ổn định với cam kết thời gian hoạt động (Uptime) đạt 99.9% hàng tháng, ngoại trừ các trường hợp sau:',
      ],
      list: [
        'Bảo trì định kỳ: Được thông báo trước tối thiểu 24 giờ qua giao diện thông báo hệ thống hoặc email quản trị.',
        'Bảo trì khẩn cấp: Nhằm vá các lỗ hổng bảo mật nghiêm trọng vừa phát sinh.',
        'Sự kiện bất khả kháng: Thiên tai, đứt cáp quang biển quốc tế, sự cố mất điện diện rộng hoặc lệnh đình chỉ từ cơ quan quản lý.',
      ],
    },
    {
      id: 'gioi-han-trach-nhiem',
      title: '10. Giới hạn trách nhiệm pháp lý',
      paragraphs: [
        'Trong phạm vi tối đa được pháp luật Việt Nam cho phép:',
      ],
      list: [
        'Dịch vụ được cung cấp trên nguyên tắc "nguyên trạng" (As-Is) và "sẵn có" (As-Available).',
        'Chúng tôi không chịu trách nhiệm đối với các thiệt hại gián tiếp, mất cơ hội kinh doanh, thiệt hại về danh tiếng hoặc mất mát lợi nhuận tuyển sinh phát sinh từ việc sử dụng hoặc không thể sử dụng Dịch vụ.',
        'Tổng mức trách nhiệm bồi thường tối đa (nếu có) phát sinh từ bất kỳ khiếu nại nào sẽ không vượt quá tổng số phí dịch vụ mà Đơn vị đã thanh toán trong vòng 03 tháng gần nhất.',
      ],
    },
    {
      id: 'tam-ngung-cham-dut',
      title: '11. Tạm ngưng và chấm dứt dịch vụ',
      paragraphs: [
        'Quy định về việc tạm ngưng hoặc hủy bỏ quyền truy cập dịch vụ:',
      ],
      list: [
        'Tạm ngưng khẩn cấp: Chúng tôi có quyền tạm khóa quyền truy cập của một Workspace nếu phát hiện lưu lượng bất thường có dấu hiệu tấn công DDoS hoặc tài khoản bị chiếm đoạt để phát tán mã độc.',
        'Chấm dứt do vi phạm: Đơn vị vi phạm nghiêm trọng Điều khoản sử dụng và không khắc phục trong vòng 07 ngày làm việc kể từ khi nhận văn bản cảnh báo.',
        'Xuất dữ liệu khi chấm dứt: Khi hợp đồng dịch vụ kết thúc hợp pháp, Đơn vị được hỗ trợ xuất toàn bộ dữ liệu ứng viên dưới định dạng tiêu chuẩn (JSON/Excel) trong vòng 30 ngày trước khi dữ liệu được làm sạch khỏi hệ thống.',
      ],
    },
    {
      id: 'luat-ap-dung-tranh-chap',
      title: '12. Luật điều chỉnh và giải quyết tranh chấp',
      paragraphs: [
        'Điều khoản dịch vụ này được điều chỉnh, diễn giải và thi hành theo pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.',
        'Mọi tranh chấp phát sinh liên quan đến việc sử dụng Dịch vụ trước hết sẽ được giải quyết thông qua thương lượng thiện chí giữa các bên. Trong trường hợp không đạt được thỏa thuận trong vòng 30 ngày, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại địa bàn nơi đơn vị vận hành đặt trụ sở chính.',
      ],
    },
    {
      id: 'thay-doi-dieu-khoan',
      title: '13. Thay đổi và hiệu lực của điều khoản',
      paragraphs: [
        'Chúng tôi bảo lưu quyền sửa đổi, bổ sung các nội dung của bản Điều khoản này bất kỳ lúc nào để phù hợp với sự phát triển của sản phẩm và các quy định pháp luật mới.',
        'Các sửa đổi có hiệu lực ngay khi được công bố trên trang web. Việc người dùng tiếp tục đăng nhập và sử dụng hệ thống sau thời điểm điều khoản sửa đổi được ban hành đồng nghĩa với việc chấp thuận vô điều kiện các thay đổi đó.',
      ],
    },
    {
      id: 'thong-tin-lien-he-dieu-khoan',
      title: '14. Thông tin liên hệ và giải đáp',
      paragraphs: [
        'Mọi câu hỏi, đề xuất hợp tác hoặc yêu cầu hỗ trợ pháp lý liên quan đến Điều khoản dịch vụ, vui lòng liên hệ theo thông tin chính thức sau:',
      ],
      list: [
        `Cơ quan chủ quản: ${ORGANIZATION_INFO.name}`,
        `Địa chỉ trụ sở: ${ORGANIZATION_INFO.address}`,
        `Hộp thư tiếp nhận: ${ORGANIZATION_INFO.contactEmail}`,
        `Số điện thoại hỗ trợ: ${ORGANIZATION_INFO.phone}`,
        `Trang web chính thức: ${ORGANIZATION_INFO.website}`,
      ],
    },
  ],
};
