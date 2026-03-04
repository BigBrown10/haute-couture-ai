'use client';

interface SplashScreenProps {
    onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
    return (
        <div className="splash-screen">
            <div className="splash-brand">
                <h1 className="landing-title-premium-small">HAUTE COUTURE</h1>
            </div>

            <div className="spline-bg-wrapper">
                <iframe
                    src='https://my.spline.design/webdesign-OAsz88Dt18LZ3tHdrj0XZsWf/'
                    frameBorder='0'
                    width='100%'
                    height='100%'
                    className="spline-iframe"
                    title="Interactive Eye Background"
                />
            </div>

            <div className="splash-action">
                <button className="splash-enter-btn" onClick={onEnter}>
                    ENTER PLATFORM
                </button>
            </div>
        </div>
    );
}
