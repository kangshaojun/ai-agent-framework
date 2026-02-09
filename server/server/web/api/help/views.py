"""Help API views."""

from fastapi import APIRouter

from server.web.api.help.schemas import HelpContentResponse
from server.web.api.response import ApiResponse

router = APIRouter()


# Static help content
HELP_CONTENT = """# AI Assistant 帮助中心

欢迎使用 AI Assistant！本文档将帮助您快速了解如何使用我们的智能助手。

## 快速开始

### 1. 注册与登录
- 访问登录页面，点击"注册"创建新账号
- 填写用户名、邮箱和密码完成注册
- 使用注册的账号登录系统

### 2. 开始对话
- 登录后进入聊天界面
- 点击左侧"New Chat"按钮创建新对话
- 在输入框中输入您的问题，按 Enter 发送

### 3. 管理对话
- 点击左侧对话列表可切换历史对话
- 点击对话右侧菜单可重命名或删除对话
- 对话会自动保存，下次登录可继续查看

## 主要功能

### 智能问答
我们的 AI 助手可以帮您：
- 回答各类知识性问题
- 协助写作和翻译
- 解释复杂概念
- 提供建议和思路

### 流式响应
- AI 回复采用流式输出，您可以实时看到生成过程
- 支持长文本回答，可滚动查看完整内容

## 常见问题

**Q: 如何修改对话标题？**
A: 将鼠标悬停在左侧对话上，点击菜单图标选择"Rename"。

**Q: 对话历史会保存多久？**
A: 对话永久保存，您可以随时回顾历史记录。

**Q: 支持哪些语言？**
A: 支持中文、英文等多种语言的对话。

## 使用技巧

1. **清晰的问题**：描述越清晰，回答越准确
2. **上下文连贯**：在同一个对话中保持话题连贯性
3. **分步提问**：复杂问题可以拆分成多个步骤询问

## 联系我们

如遇到问题或有建议，欢迎反馈给我们。

---
*最后更新：2024年*
"""


@router.get("/content", response_model=ApiResponse[HelpContentResponse])
async def get_help_content() -> ApiResponse[HelpContentResponse]:
    """
    Get help center content.

    :return: Help content with title and markdown content
    """
    data = HelpContentResponse(
        title="帮助中心",
        content=HELP_CONTENT,
        version="1.0.0"
    )
    return ApiResponse.success(data=data, msg="获取成功")
