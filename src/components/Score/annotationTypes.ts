/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AnnotationTool = 'select' | 'pen' | 'highlight' | 'rectangle' | 'text' | 'eraser';

export interface Point {
  x: number; // Normalized coordinate 0..1000
  y: number; // Normalized coordinate 0..1000
}

export interface BaseAnnotation {
  id: string;
  page: number;
  createdAt: number;
  label?: string;
}

export interface Bookmark {
  id: string;
  page: number;
  title: string;
  createdAt: number;
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen';
  points: Point[];
  color: string;
  strokeWidth: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderOnly?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  backgroundColor?: string;
  hasBorder?: boolean;
}

export type Annotation = PenAnnotation | HighlightAnnotation | TextAnnotation;

export interface DocumentAnnotations {
  scoreTitle: string;
  version: number;
  updatedAt: number;
  annotations: Record<number, Annotation[]>; // key is page number
  bookmarks?: Bookmark[];
}

export interface AnnotationState {
  activeTool: AnnotationTool;
  color: string;
  strokeWidth: number;
  highlightColor: string;
  rectBorderColor: string;
  rectBorderWidth: number;
  fontSize: number;
  textColor: string;
  textBgColor: string;
  textHasBorder: boolean;
  isVisible: boolean;
  selectedAnnotationId: string | null;
}
