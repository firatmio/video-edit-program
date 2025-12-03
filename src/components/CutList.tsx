import {
    ChevronLeft,
    ChevronRight,
    Eye,
    Plus,
    Scissors,
    Trash2
} from "lucide-solid";
import { For } from "solid-js";
import type { CutSegment } from "../types";
import { formatTime } from "../utils";

interface CutListProps {
    segments: CutSegment[];
    currentTime: number;
    duration: number;
    onAddSegment: () => void;
    onRemoveSegment: (id: string) => void;
    onSetStart: (id: string) => void;
    onSetEnd: (id: string) => void;
    onJumpToSegment: (segment: CutSegment) => void;
}

export function CutList(props: CutListProps) {
    const getSegmentDuration = (segment: CutSegment): number => {
        return segment.endTime - segment.startTime;
    };

    const getTotalDuration = (): number => {
        return props.segments.reduce((sum, seg) => sum + getSegmentDuration(seg), 0);
    };

    return (
        <div class="cut-list">
            <div class="cut-list-header">
                <h3>Kesim Listesi</h3>
                <button class="add-segment-btn" onClick={props.onAddSegment} title="Yeni kesim ekle">
                    <Plus size={16} /> Kesim Ekle
                </button>
            </div>

            {!(props.segments.length === 0) && (
                <div class="segments-container">
                    <For each={props.segments}>
                        {(segment, index) => (
                            <div class="segment-item">
                                <div class="segment-info">
                                    <span class="segment-number">#{index() + 1}</span>
                                    <div class="segment-times">
                                        <div class="time-row">
                                            <span class="time-label">Başlangıç:</span>
                                            <span class="time-value">{formatTime(segment.startTime)}</span>
                                            <button
                                                class="set-time-btn"
                                                onClick={() => props.onSetStart(segment.id)}
                                                title="Mevcut zamanı başlangıç olarak ayarla"
                                            >
                                                <ChevronLeft size={12} /> Ayarla
                                            </button>
                                        </div>
                                        <div class="time-row">
                                            <span class="time-label">Bitiş:</span>
                                            <span class="time-value">{formatTime(segment.endTime)}</span>
                                            <button
                                                class="set-time-btn"
                                                onClick={() => props.onSetEnd(segment.id)}
                                                title="Mevcut zamanı bitiş olarak ayarla"
                                            >
                                                Ayarla <ChevronRight size={12} />
                                            </button>
                                        </div>
                                        <div class="segment-duration">
                                            Süre: {formatTime(getSegmentDuration(segment))}
                                        </div>
                                    </div>
                                </div>
                                <div class="segment-actions">
                                    <button
                                        class="jump-btn"
                                        onClick={() => props.onJumpToSegment(segment)}
                                        title="Bu kesime git"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        class="remove-btn"
                                        onClick={() => props.onRemoveSegment(segment.id)}
                                        title="Kesimi sil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            )}

            {props.segments.length > 0 && (
                <div class="cut-list-footer">
                    <div class="total-info">
                        <span>Toplam {props.segments.length} kesim</span>
                        <span>Toplam süre: {formatTime(getTotalDuration())}</span>
                    </div>
                </div>
            )}

            {props.segments.length === 0 && (
                <div class="empty-state">
                    <Scissors size={32} class="empty-icon" />
                    <p>Henüz kesim yok</p>
                    <p class="hint">"Kesim Ekle" ile yeni bir kesim oluşturun</p>
                </div>
            )}
        </div>
    );
}
