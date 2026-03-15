'use client';

import { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    text: string;
    timestamp: number;
    imageBase64?: string;
    imageCaption?: string;
    thought?: string;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string, pendingImage?: { base64: string, type: 'photo' | 'garment' }) => void;
    isOpen: boolean;
    onToggle: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    personaName?: string;
    canTryOn: boolean;
    micEnabled?: boolean;
    onToggleMic?: () => void;
    onUploadPhoto?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTryFit?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEndSession?: () => void;
    onRequestStudioEdit?: (engine: string, action: string, prompt: string, baseImage: string) => void;
    studioEditResult?: string[];
}

type TabMode = 'chat' | 'studio';

const suggestions = [
    "What's trending?",
    "Show me something edgy",
    "Analyze my style",
    "Try a bold look"
];

function ThoughtBlock({ text, persona }: { text: string, persona: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '4px'
        }} onClick={() => setIsExpanded(!isExpanded)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.7rem', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                    {persona} is thinking...
                </div>
                <div style={{ fontSize: '0.6rem', color: isExpanded ? '#d4a853' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                    {isExpanded ? 'Hide' : 'Show Details'}
                </div>
            </div>
            {isExpanded && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                    color: 'rgba(255,255,255,0.3)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '8px',
                    whiteSpace: 'pre-wrap',
                    fontStyle: 'italic'
                }}>
                    {text}
                </div>
            )}
        </div>
    );
}

export default function ChatPanel({
    messages, onSendMessage, isOpen, onToggle,
    isExpanded, onToggleExpand, personaName = 'Stylist',
    canTryOn,
    micEnabled = false, onToggleMic,
    onUploadPhoto, onTryFit, onEndSession,
    onRequestStudioEdit, studioEditResult,
}: ChatPanelProps) {
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState<TabMode>('chat');
    const [pendingImage, setPendingImage] = useState<{ base64: string, type: 'photo' | 'garment' } | null>(null);
    const [studioImage, setStudioImage] = useState<string | null>(null);
    const [studioOptions, setStudioOptions] = useState<string[]>([]);
    const [studioOptionIdx, setStudioOptionIdx] = useState(0);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturate, setSaturate] = useState(100);
    const [blur, setBlur] = useState(0);
    const [hueRotate, setHueRotate] = useState(0);

    // Studio Animation Engine State
    const [engine, setEngine] = useState('veo');
    const [studioAction, setStudioAction] = useState('animate');
    const [studioPrompt, setStudioPrompt] = useState('');
    const [studioGenerating, setStudioGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle incoming studio edit results
    useEffect(() => {
        if (studioEditResult && studioGenerating) {
            if (studioEditResult.length > 0) {
                setStudioOptions(studioEditResult);
                setStudioOptionIdx(0);
                setStudioImage(studioEditResult[0]);
            }
            setStudioGenerating(false);
        }
    }, [studioEditResult, studioGenerating]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed && !pendingImage) return;
        onSendMessage(trimmed, pendingImage || undefined);
        setInput('');
        setPendingImage(null);
    };

    const handleFileUpload = (type: 'photo' | 'garment') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (result) {
                // remove the 'data:image/jpeg;base64,' prefix
                const base64Data = result.split(',')[1];
                setPendingImage({ base64: base64Data, type });
            }
        };
        reader.readAsDataURL(file);

        // Clear input so same file can be selected again
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Open image in studio for editing
    const openInStudio = (imageBase64: string) => {
        setStudioImage(imageBase64);
        setActiveTab('studio');
        // Reset filters
        setBrightness(100);
        setContrast(100);
        setSaturate(100);
        setBlur(0);
        setHueRotate(0);
        setEditMode(null);
    };

    // Download edited image
    const downloadImage = () => {
        if (!studioImage) return;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;
            ctx.drawImage(img, 0, 0);
            const link = document.createElement('a');
            link.download = 'edited-outfit.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = `data:image/png;base64,${studioImage}`;
    };

    const resetFilters = () => {
        setBrightness(100);
        setContrast(100);
        setSaturate(100);
        setBlur(0);
        setHueRotate(0);
    };

    const handleStudioGenerate = () => {
        if (!studioImage || !onRequestStudioEdit) return;
        setStudioGenerating(true);
        onRequestStudioEdit(engine, studioAction, studioPrompt, studioImage);
    };

    const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;

    const suggestions = [
        "What's trending?",
        "Show me something edgy",
        "Analyze my style",
        "Try a bold look"
    ];

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: isExpanded ? '100%' : '440px',
            height: '100%',
            background: '#0a0a0d', 
            backdropFilter: 'blur(25px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            zIndex: 1000,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
            borderRadius: isExpanded ? '0' : '24px 0 0 24px',
        }}>
            {/* Header with Tabs */}
            <div style={{
                padding: '14px 16px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '4px' }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#4dff91', boxShadow: '0 0 8px rgba(77, 255, 145, 0.6)'
                        }} />
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: '#fff', opacity: 0.9
                        }}>
                             {personaName}
                        </span>
                    </div>
                    <button
                        onClick={onToggleExpand}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', color: '#fff', cursor: 'pointer',
                            padding: '6px 10px', fontSize: '0.7rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ opacity: 0.7 }}>🗉</span> Text Only
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
                    {(['chat', 'studio'] as TabMode[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '12px 0', fontSize: '0.72rem', fontWeight: 800,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.3)',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                borderBottom: activeTab === tab ? '2px solid #d4a853' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s var(--ease-out-expo)', fontFamily: "'Inter', sans-serif",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            {tab === 'chat' ? (
                                <><span style={{ fontSize: '1rem', opacity: activeTab === tab ? 1 : 0.5 }}>💬</span> CHAT</>
                            ) : (
                                <><span style={{ fontSize: '1rem', opacity: activeTab === tab ? 1 : 0.5 }}>🎨</span> STUDIO</>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                    {/* Messages */}
                    <div ref={scrollRef} style={{
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '16px 16px 8px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        scrollbarWidth: 'thin', 
                        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                    }}>
                        {messages.length === 0 && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', flex: 1, gap: '16px', opacity: 0.6,
                            }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)'
                                }}>💬</div>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: '0.02em' }}>
                                    Type or speak to {personaName}
                                </span>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '88%',
                            }}>
                                {(() => {
                                    // 1. Extract reasoning from text blocks wrapped in **
                                    const reasoningMatch = msg.text.match(/\*\*([\s\S]*?)\*\*/g);
                                    let extractedReasoning = reasoningMatch 
                                        ? reasoningMatch.map(m => m.replace(/\*\*/g, '')).join('\n') 
                                        : '';
                                    
                                    // 2. Strip reasoning from the main speech text
                                    let rawSpeech = msg.text.replace(/\*\*[\s\S]*?\*\*/g, '').replace(/\*\*/g, '');
                                    
                                    // 3. Sentence-level Heuristic: Move sentences containing jargon to thoughts
                                    const sentences = rawSpeech.split(/(?<=[.!?])\s+/);
                                    const jargonRegex = /PROTOCOL|INITIATED|ACTIVATED|USER-FIRST|CONSENT|MANDATORY|STEP|TOOL|CALL|GENERATE_OUTFIT|SKIPPING|CREDIT|BREVITY|IMAGINATION/i;
                                    
                                    let cleanSpeechSentences: string[] = [];
                                    let movedToThoughts: string[] = [];

                                    sentences.forEach(s => {
                                        if (jargonRegex.test(s)) {
                                            movedToThoughts.push(s);
                                        } else {
                                            cleanSpeechSentences.push(s);
                                        }
                                    });

                                    let cleanSpeech = cleanSpeechSentences.join(' ').trim();
                                    let combinedThought = (msg.thought || '') + 
                                                          (extractedReasoning ? `\n${extractedReasoning}` : '') + 
                                                          (movedToThoughts.length > 0 ? `\n${movedToThoughts.join(' ')}` : '');

                                    // 4. Final safety scrub of forbidden words themselves
                                    const forbidden = [
                                        /GREETING PROTOCOL/gi, /USER-FIRST/gi, /CONSENT PROTOCOL/gi, 
                                        /INITIATED/gi, /ACTIVATED/gi, /PROTOCOL/gi, /MANDATORY/gi,
                                        /CREDIT SAVING/gi, /BREVITY PROTOCOL/gi, /IMAGINATION PROTOCOL/gi,
                                        /ROBOT-FREE SPEECH/gi, /FORMATTING REQUIREMENTS/gi, /VOICE PERSONALITY/gi
                                    ];
                                    
                                    forbidden.forEach(reg => {
                                        cleanSpeech = cleanSpeech.replace(reg, '');
                                        combinedThought = combinedThought.replace(reg, '');
                                    });

                                    cleanSpeech = cleanSpeech.trim();
                                    combinedThought = combinedThought.trim();

                                    return (
                                        <>
                                            {combinedThought && (
                                                <div style={{ width: '100%', marginBottom: cleanSpeech ? '8px' : '0' }}>
                                                    <ThoughtBlock text={combinedThought} persona={personaName} />
                                                </div>
                                            )}
                                            {cleanSpeech && (
                                                <div style={{
                                                    padding: '8px 12px',
                                                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                                    background: msg.role === 'user'
                                                        ? 'rgba(255, 255, 255, 0.05)'
                                                        : 'rgba(206, 254, 0, 0.06)',
                                                    border: `1px solid ${msg.role === 'user'
                                                        ? 'rgba(255, 255, 255, 0.1)'
                                                        : 'rgba(206, 254, 0, 0.15)'}`,
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1.5,
                                                    color: msg.role === 'user' ? '#f6f4f0' : 'var(--color-acid-green)',
                                                }}>
                                                    {cleanSpeech}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                {/* Inline outfit image — clickable to open in studio */}
                                {msg.imageBase64 && (
                                    <div style={{ marginTop: '6px' }}>
                                        <img
                                            src={`data:image/png;base64,${msg.imageBase64}`}
                                            alt={msg.imageCaption || 'Generated outfit'}
                                            onClick={() => setLightboxImage(msg.imageBase64!)}
                                            style={{
                                                width: '100%', maxWidth: '260px', borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                cursor: 'zoom-in', transition: 'transform 0.2s',
                                            }}
                                            title="Click to enlarge"
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            {msg.imageCaption && (
                                                <p style={{
                                                    fontSize: '0.7rem', color: 'rgba(245,245,247,0.35)',
                                                    fontStyle: 'italic', flex: 1, margin: 0,
                                                }}>{msg.imageCaption}</p>
                                            )}
                                            <button
                                                onClick={() => openInStudio(msg.imageBase64!)}
                                                style={{
                                                    background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)',
                                                    borderRadius: '6px', color: '#f0c97a', cursor: 'pointer',
                                                    padding: '2px 8px', fontSize: '0.65rem', flexShrink: 0,
                                                    fontFamily: "'Inter', sans-serif",
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Suggestion Pills */}
                    {messages.length === 0 && (
                        <div style={{
                            padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px',
                            justifyContent: 'flex-end'
                        }}>
                            {suggestions.map((s) => (
                                <button key={s} onClick={() => onSendMessage(s)} style={{
                                    padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s',
                                    fontFamily: "'Inter', sans-serif",
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Row Match: [Input] [Photo] [Dress] [Up Arrow] [Mic] */}
                    <div style={{
                        padding: '12px 16px 24px', flexShrink: 0,
                        position: 'relative', background: 'transparent'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'rgba(255,255,255,0.06)', borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.08)', padding: '8px 14px',
                            gap: '12px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={pendingImage ? "Add style notes..." : "Type a message..."}
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', 
                                    outline: 'none', color: '#fff', fontSize: '0.92rem', 
                                    fontFamily: "'Inter', sans-serif", opacity: 0.9
                                }}
                            />
                            
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Send Button (Up Arrow) - Now First */}
                                <button onClick={handleSend} disabled={!input.trim() && !pendingImage} style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    background: (input.trim() || pendingImage) ? 'rgba(245,245,247,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: 'none', cursor: (input.trim() || pendingImage) ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="#f5f5f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: (input.trim() || pendingImage) ? 1 : 0.4 }}/>
                                    </svg>
                                </button>

                                {/* Photo Upload Button */}
                                <label title="Upload photo" style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUploadPhoto} />
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10Z" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M10.5 2L9 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4H15L13.5 2H10.5Z" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </label>

                                {/* Dress / Try On Button */}
                                <label title={canTryOn ? 'Try on garment' : 'Upload photo first'} style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    background: canTryOn ? 'rgba(245, 245, 247, 0.12)' : 'rgba(255,255,255,0.03)',
                                    cursor: canTryOn ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: canTryOn ? 1 : 0.25,
                                    border: canTryOn ? '1px solid rgba(245, 245, 247, 0.2)' : 'none',
                                    transition: 'all 0.2s'
                                }}>
                                    <input type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={canTryOn ? onTryFit : undefined} disabled={!canTryOn} />
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 4L4 7V10C4 13.5 12 21 12 21C12 21 20 13.5 20 10V7L12 4Z" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M8 8V10C8 10 10 11 12 11C14 11 16 10 16 10V8" stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </label>

                                <button onClick={onToggleMic} title={micEnabled ? 'Mute' : 'Unmute'} style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    background: micEnabled ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.06)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: micEnabled ? '1px solid rgba(212,168,83,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.2s',
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 1C11.2044 1 10.4413 1.31607 9.87868 1.87868C9.31607 2.44129 9 3.20435 9 4V12C9 12.7956 9.31607 13.5587 9.87868 14.1213C10.4413 14.6839 11.2044 15 12 15C12.7956 15 13.5587 14.6839 14.1213 14.1213C14.6839 13.5587 15 12.7956 15 12V4C15 3.20435 14.6839 2.44129 14.1213 1.87868C13.5587 1.31607 12.7956 1 12 1Z" stroke={micEnabled ? '#f0c97a' : '#f5f5f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M19 10V12C19 13.8565 18.2625 15.637 16.9497 16.9497C15.637 18.2625 13.8565 19 12 19C10.1435 19 8.36301 18.2625 7.05025 16.9497C5.73749 15.637 5 13.8565 5 12V10" stroke={micEnabled ? '#f0c97a' : '#f5f5f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 19V23" stroke={micEnabled ? '#f0c97a' : '#f5f5f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M8 23H16" stroke={micEnabled ? '#f0c97a' : '#f5f5f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── STUDIO TAB ─── */}
            {activeTab === 'studio' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!studioImage ? (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '16px', opacity: 0.4,
                        }}>
                            <span style={{ fontSize: '2.5rem' }}>🎨</span>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(245,245,247,0.5)', textAlign: 'center' }}>
                                Click &quot;Edit&quot; on any generated image<br />to open it here
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Image Preview with filters applied */}
                            <div style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)',
                            }}>
                                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                                    <canvas
                                        ref={canvasRef}
                                        style={{
                                            display: 'none'
                                        }}
                                    />
                                    {studioImage?.startsWith('data:video') || studioImage?.endsWith('.mp4') ? (
                                        <video
                                            src={studioImage.startsWith('data:') ? studioImage : `data:video/mp4;base64,${studioImage}`}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '12px'
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={studioImage?.startsWith('data:') ? studioImage : `data:image/png;base64,${studioImage}`}
                                            alt="Studio Editor"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                filter: filterStyle,
                                                transition: 'filter 0.1s', // Smooth slider updates
                                            }}
                                        />
                                    )}

                                    {/* Multi-option Navigation Overlay */}
                                    {studioOptions.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const newIdx = Math.max(0, studioOptionIdx - 1);
                                                    setStudioOptionIdx(newIdx);
                                                    setStudioImage(studioOptions[newIdx]);
                                                }}
                                                disabled={studioOptionIdx === 0}
                                                style={{
                                                    position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)',
                                                    background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                                                    width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: studioOptionIdx === 0 ? 0.3 : 1
                                                }}
                                            >
                                                {'<'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newIdx = Math.min(studioOptions.length - 1, studioOptionIdx + 1);
                                                    setStudioOptionIdx(newIdx);
                                                    setStudioImage(studioOptions[newIdx]);
                                                }}
                                                disabled={studioOptionIdx === studioOptions.length - 1}
                                                style={{
                                                    position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)',
                                                    background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                                                    width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: studioOptionIdx === studioOptions.length - 1 ? 0.3 : 1
                                                }}
                                            >
                                                {'>'}
                                            </button>
                                            <div style={{
                                                position: 'absolute', bottom: '10px', right: '10px',
                                                background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '12px',
                                                fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em'
                                            }}>
                                                Option {studioOptionIdx + 1} of {studioOptions.length}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Animation Engine Controls */}
                            <div style={{
                                padding: '10px 14px 14px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', flexDirection: 'column', gap: '10px',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.65rem', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engine</label>
                                        <select
                                            value={engine}
                                            onChange={(e) => setEngine(e.target.value)}
                                            style={{
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px', color: '#f5f5f7', padding: '6px', fontSize: '0.75rem',
                                                outline: 'none', fontFamily: "'Inter', sans-serif"
                                            }}
                                        >
                                            <option value="veo" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Google Veo 3 (Video Engine)</option>
                                            <option value="banana" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Nano Banana 2 (Image Gen)</option>
                                            <option value="nano" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Nano Adapter</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.65rem', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</label>
                                        <select
                                            value={studioAction}
                                            onChange={(e) => setStudioAction(e.target.value)}
                                            style={{
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px', color: '#f5f5f7', padding: '6px', fontSize: '0.75rem',
                                                outline: 'none', fontFamily: "'Inter', sans-serif"
                                            }}
                                        >
                                            <option value="animate" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Animate (Keyframes)</option>
                                            <option value="reimagine" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Reimagine (Image)</option>
                                            <option value="upscale" style={{ background: '#1a1a1a', color: '#f5f5f7' }}>Upscale (4K)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* QUICK PRESETS SECTION */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--color-acid-green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>PRO RETOUCH PRESETS</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {[
                                            { label: '✨ High-End', prompt: 'Professional high-end fashion magazine retouch, flawless skin, cinematic lighting, ultra-detailed textures.' },
                                            { label: '🖼️ 4K Upscale', prompt: 'Subtle enhancement, sharpen details, ultra-high resolution, clear textures, professional photography finish.' },
                                            { label: '🎭 Artistic', prompt: 'Avant-garde fashion edge, dramatic shadows, stylistic color grading, high contrast, runway aesthetic.' }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                onClick={() => {
                                                    setStudioPrompt(preset.prompt);
                                                    setEngine('veo');
                                                    setStudioAction('reimagine');
                                                }}
                                                style={{
                                                    flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem',
                                                    background: studioPrompt === preset.prompt ? 'rgba(206, 254, 0, 0.2)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${studioPrompt === preset.prompt ? 'var(--color-acid-green)' : 'rgba(255,255,255,0.08)'}`,
                                                    color: studioPrompt === preset.prompt ? 'var(--color-acid-green)' : 'rgba(245,245,247,0.5)',
                                                    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt / Directives</label>
                                    <textarea
                                        value={studioPrompt}
                                        onChange={(e) => setStudioPrompt(e.target.value)}
                                        placeholder="E.g., Make the fabric blow gently in the wind..."
                                        rows={2}
                                        style={{
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '6px', color: '#f5f5f7', padding: '8px', fontSize: '0.75rem',
                                            outline: 'none', fontFamily: "'Inter', sans-serif", resize: 'none',
                                            scrollbarWidth: 'none'
                                        }}
                                    />
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    <button onClick={downloadImage} style={{
                                        flex: 1, padding: '7px', borderRadius: '8px', fontSize: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#f5f5f7', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                    }}>⬇ Image</button>
                                    <button
                                        onClick={handleStudioGenerate}
                                        disabled={studioGenerating}
                                        style={{
                                            flex: 2, padding: '7px', borderRadius: '8px', fontSize: '0.75rem',
                                            background: studioGenerating ? 'rgba(212,168,83,0.4)' : 'rgba(212,168,83,0.9)',
                                            border: 'none',
                                            color: '#000', cursor: studioGenerating ? 'wait' : 'pointer', fontFamily: "'Inter', sans-serif",
                                            fontWeight: 600
                                        }}
                                    >
                                        {studioGenerating ? 'Processing...' : '✨ Generate'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── LIGHTBOX OVERLAY ─── */}
            {lightboxImage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }} onClick={() => setLightboxImage(null)}>
                    <button style={{
                        position: 'absolute', top: '20px', right: '30px', background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%',
                        width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                    <img
                        src={`data:image/png;base64,${lightboxImage}`}
                        alt="Enlarged view"
                        style={{
                            maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain',
                            borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); openInStudio(lightboxImage); }}
                            style={{
                                padding: '10px 24px', borderRadius: '8px', fontSize: '0.9rem',
                                background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.4)',
                                color: '#f0c97a', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            ✏️ Edit in Studio
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
