import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ShootingStarIntroProps {
    onComplete: () => void;
    targetRect?: DOMRect;
}

export const ShootingStarIntro: React.FC<ShootingStarIntroProps> = ({ onComplete, targetRect }) => {
    // We don't need window size anymore, we position relative to the fixed button position.
    // Button position: bottom-6 right-6 (24px). Size: w-14 h-14 (56px).
    // Center coordinates relative to window bottom-right:
    // Right: 24px + 28px = 52px
    // Bottom: 24px + 28px = 52px

    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    useEffect(() => {
        // Sequence Management
        const tooltipShowTimer = setTimeout(() => setIsTooltipVisible(true), 800); // Show tooltip
        const tooltipHideTimer = setTimeout(() => setIsTooltipVisible(false), 2300); // Hide tooltip gracefully before finish
        const completeTimer = setTimeout(onComplete, 2800); // Hand over control

        return () => {
            clearTimeout(tooltipShowTimer);
            clearTimeout(tooltipHideTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {/* Positioning Container - Anchored to bottom-right */}
            <div className="absolute bottom-6 right-6 w-14 h-14 flex items-center justify-center pointer-events-none">

                {/* 1. Ambient Bloom (Aura) - Removed as requested */}

                {/* 2. Signal Pulse (Radar Ripple) */}
                <motion.div
                    className="absolute left-1/2 top-1/2 border border-blue-400 rounded-full opacity-0 pointer-events-none"
                    initial={{ x: "-50%", y: "-50%" }}
                    animate={{
                        width: ['100%', '300%'],
                        height: ['100%', '300%'],
                        opacity: [0, 0.8, 0],
                        borderWidth: ['1px', '0px']
                    }}
                    transition={{
                        delay: 0.6,
                        duration: 1.5,
                        ease: "easeOut"
                        // Removed repeat to prevent cutoff
                    }}
                />

                {/* 3. Construct (Button Background) */}
                <motion.div
                    className="absolute inset-0 bg-blue-600 rounded-full shadow-lg z-10 pointer-events-none"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                    }}
                >
                    {/* Inner Highlight/Sheen */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
                </motion.div>

                {/* 4. Icon Assembly */}
                <motion.div
                    className="relative z-20 text-white flex items-center justify-center pointer-events-none"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        delay: 0.4,
                        type: "spring",
                        stiffness: 400,
                        damping: 15
                    }}
                >
                    <Sparkles className="w-6 h-6" />
                </motion.div>

                {/* 5. Tooltip "AI Assistant Ready" */}
                <AnimatePresence>
                    {isTooltipVisible && (
                        <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 5, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-white/80 backdrop-blur-md text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-white/60 z-30 flex items-center gap-2 pointer-events-none"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            AI Assistant Ready
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};
