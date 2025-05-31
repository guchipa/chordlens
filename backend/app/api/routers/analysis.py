from fastapi import APIRouter, HTTPException
from app.schemas.analysis_schemas import AudioData, AnalysisResult
from app.services.analysis_service import perform_audio_analysis
from typing import List, Optional

router = APIRouter()


@router.post(
    "/analyze", response_model=List[Optional[float]]
)  # evalの戻り値に合わせて調整
async def analyze_audio_data(data: AudioData):
    try:
        # サービス層の関数を呼び出して解析を実行
        result = await perform_audio_analysis(
            audio_base64=data.audio_base64,
            sample_rate=data.sample_rate,
            pitch_list=data.pitch_list,
        )
        if result is None:
            return []  # 結果がない場合は空リストなどを返す
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
