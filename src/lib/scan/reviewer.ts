import type { CompareResult, Curation, DescriptionOut, GarmentAnalysis, ShotReview, StoryOut, Target } from "./schemas";

/**
 * 카메라 UI 와 AI 분석 로직 사이의 경계.
 *
 * 1차 구현(GeminiImageReviewer)은 촬영한 사진 1장마다 Firebase AI Logic generateContent 를 호출한다.
 * 이후 Gemini Live API 로 바꿀 때는 같은 인터페이스를 구현하는 LiveReviewer 를 만들어
 * (예: 카메라 프레임 스트림 → live session → 같은 ShotReview 구조로 변환) ScanFlow 에 주입하면 된다.
 * 카메라 컴포넌트(CameraCapture)는 Blob 만 내보내므로 바뀌지 않는다.
 */

export interface ShotInput {
  imageId: string;
  blob: Blob;
  target: Target;
  attempt: number;
}

export interface AnalysisImage {
  id: string;
  blob: Blob;
  target: Target;
  reviewed: boolean;
}

export interface ShotReviewer {
  readonly model: string;
  reviewShot(input: ShotInput, signal?: AbortSignal): Promise<ShotReview>;
  analyzeGarment(images: AnalysisImage[], signal?: AbortSignal): Promise<GarmentAnalysis>;
  curateGarment(images: AnalysisImage[], analysis: GarmentAnalysis, signal?: AbortSignal): Promise<Curation>;
  compareWithReference(user: Blob, reference: Blob, candidateName: string, signal?: AbortSignal): Promise<CompareResult>;
  writeDescription(facts: Record<string, unknown>, observations: Record<string, unknown>, signal?: AbortSignal): Promise<DescriptionOut["lines"]>;
  writeStory(product: Record<string, unknown>, sources: { id: string; scope: string; excerpt: string; publisher: string }[], signal?: AbortSignal): Promise<StoryOut["blocks"]>;
}
