from typing import Any, List, Optional
from pydantic import BaseModel


class ModuleInfo(BaseModel):
    Key: Optional[str] = None
    Name: Optional[str] = None
    UserProviderEspace: Optional[str] = None
    DefaultTransition: Optional[str] = None
    UseCookies: Optional[str] = None
    WebScreenRenderingMode: Optional[str] = None
    ModuleType: Optional[str] = None
    Actions: Optional[Any] = None
    ServiceAPIMethods: Optional[Any] = None
    Entities: Optional[Any] = None
    Structures: Optional[Any] = None
    SiteProperties: Optional[Any] = None
    SystemRoles: Optional[Any] = None
    Exceptions: Optional[Any] = None



class OMLParseResponse(BaseModel):
    filename: str
    success: bool
    error: Optional[str] = None
    module_info: Optional[ModuleInfo] = None
    data: Any = None


class BatchProcessResponse(BaseModel):
    message: str
    total_files: int
    results: List[OMLParseResponse]

