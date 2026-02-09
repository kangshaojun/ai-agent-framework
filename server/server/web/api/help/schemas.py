"""Help API schemas."""

from pydantic import BaseModel, Field


class HelpContentResponse(BaseModel):
    """Schema for help content response."""

    title: str = Field(..., description="Help page title")
    content: str = Field(..., description="Help content (Markdown)")
    version: str = Field("1.0", description="Help content version")
