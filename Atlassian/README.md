# Atlassian MCP Server

MCP (Model Context Protocol) Server tích hợp với các dịch vụ Atlassian (Jira và Confluence).

## 🚀 Tính năng

### Jira Integration
- ✅ Tạo Jira issue mới
- ✅ Tìm kiếm issue với JQL 
- ✅ Cập nhật issue (status, assignee, comment)

### Confluence Integration  
- ✅ Tạo Confluence page mới
- ✅ Tìm kiếm page theo nội dung
- ✅ Cập nhật page hiện có


## 🔧 Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
# Atlassian API Configuration
ATLASSIAN_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token  
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net

# Jira Configuration
JIRA_PROJECT_KEY=PROJ

# Confluence Configuration  
CONFLUENCE_SPACE_KEY=SPACE

```

### 3. Lấy Atlassian API Token

1. Đăng nhập vào [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Tạo API Token mới
3. Copy token vào file `.env`

## 🎯 Sử dụng

### Development Mode
```bash
npm run server:dev
```

### Build và chạy
```bash
npm run server:build
node build/server.js
```

### Debug với Inspector
```bash
npm run server:inspect
```

## 📚 Detailed Guides

- 📋 **[QUICK_START.md](./QUICK_START.md)** - Hướng dẫn nhanh cho beginners
- 📚 **[CONFLUENCE_GUIDE.md](./CONFLUENCE_GUIDE.md)** - Hướng dẫn chi tiết Confluence tools  
- 🧪 **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Hướng dẫn test và debug
- 📝 **[test-examples.md](./test-examples.md)** - Tất cả examples

## 📚 API Reference

### Connection Testing Tools

#### `jira_test_connection`
Test kết nối Jira và lấy thông tin project.

**Parameters:**
- `projectKey` (string, optional): Project key để test

#### `confluence_test_connection` 
Test kết nối Confluence và lấy thông tin space.

**Parameters:**
- `spaceKey` (string, optional): Space key để test

### Jira Tools

#### `jira_create_issue`
Tạo issue mới trong Jira.

**Parameters:**
- `summary` (string): Tiêu đề issue
- `description` (string, optional): Mô tả chi tiết
- `issueType` (string): Loại issue (Task, Bug, Story...)
- `priority` (string): Độ ưu tiên (High, Medium, Low)
- `assignee` (string, optional): Người được assign
- `labels` (array, optional): Danh sách labels

#### `jira_search_issues`
Tìm kiếm issue bằng JQL (Jira Query Language).

**Parameters:**
- `jql` (string): JQL query
- `maxResults` (number): Số lượng kết quả tối đa (1-100)
- `fields` (array, optional): Các field cần lấy

**Example JQL:**
```
project = "PROJ" AND status = "In Progress"
assignee = currentUser() AND created >= -7d
text ~ "bug" AND priority = High
```

#### `jira_update_issue`
Cập nhật issue hiện có.

**Parameters:**
- `issueKey` (string): Key của issue (VD: PROJ-123)
- `summary` (string, optional): Tiêu đề mới
- `description` (string, optional): Mô tả mới
- `status` (string, optional): Status mới
- `assignee` (string, optional): Assignee mới  
- `comment` (string, optional): Comment thêm vào

### Confluence Tools

#### `confluence_create_page`
Tạo page mới trong Confluence.

**Parameters:**
- `title` (string): Tiêu đề page
- `content` (string): Nội dung page (HTML format)
- `spaceKey` (string, optional): Key của space
- `parentPageId` (string, optional): ID của parent page

#### `confluence_search_pages`
Tìm kiếm page theo nội dung.

**Parameters:**
- `query` (string): Từ khóa tìm kiếm
- `spaceKey` (string, optional): Giới hạn trong space
- `limit` (number): Số lượng kết quả (1-50)

#### `confluence_update_page`
Cập nhật page hiện có.

**Parameters:**
- `pageId` (string): ID của page
- `title` (string, optional): Tiêu đề mới
- `content` (string, optional): Nội dung mới


## 🔄 Workflow Examples

### 1. Tạo issue và documentation
```typescript
// Tạo Jira issue
await jira_create_issue({
  summary: "Implement user authentication",
  description: "Add login/logout functionality with JWT",
  issueType: "Task",
  priority: "High"
});

// Tạo Confluence page cho documentation
await confluence_create_page({
  title: "User Authentication Implementation",
  content: "<h1>Requirements</h1><p>Authentication system specifications...</p>"
});
```

### 2. Update workflow
```typescript
// Cập nhật Jira issue khi hoàn thành
await jira_update_issue({
  issueKey: "PROJ-123",
  status: "Done",
  comment: "Authentication feature completed and deployed"
});

// Cập nhật documentation
await confluence_update_page({
  pageId: "123456789",
  title: "User Authentication Implementation - Completed",
  content: "<h1>Implementation Complete</h1><p>Authentication system has been deployed successfully.</p>"
});
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Kiểm tra email và API token
   - Đảm bảo account có quyền truy cập Jira/Confluence

2. **API Rate Limiting**
   - Atlassian API có giới hạn rate limit
   - Thêm delay giữa các requests nếu cần

### Debug Mode

Sử dụng debug mode để xem chi tiết requests:

```bash
DEBUG=atlassian* npm run server:dev
```

## 📝 Contributing

1. Fork repository
2. Tạo feature branch
3. Implement changes
4. Add tests
5. Create pull request

## 📄 License

ISC License - xem file LICENSE để biết thêm chi tiết.
