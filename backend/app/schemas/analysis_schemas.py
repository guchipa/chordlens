from pydantic import BaseModel
from typing import List, Optional

class AudioData(BaseModel):
    audio_base64: str
    sample_rate: int
    pitch_list: List[str]

class AnalysisResult(BaseModel):
    est_list: List[float]
    error: Optional[str] = None