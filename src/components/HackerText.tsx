"use client";

import { useState, useEffect, useRef } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?-=[]\\;',./";

interface HackerTextProps {
    text: string;
    className?: string;
    speed?: number;
    delay?: number;
}

export function HackerText({ text, className = "", speed = 30, delay = 0 }: HackerTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const [isAnimating, setIsAnimating] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startAnimation = () => {
        if (isAnimating) return;
        setIsAnimating(true);

        let iteration = 0;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText((currentText) => {
                return text
                    .split("")
                    .map((letter, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
                    })
                    .join("");
            });

            if (iteration >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsAnimating(false);
            }

            iteration += 1 / 3;
        }, speed);
    };

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (delay > 0) {
            setDisplayText(text.split("").map(() => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(""));
            timeout = setTimeout(() => {
                startAnimation();
            }, delay);
        } else {
            startAnimation();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeout) clearTimeout(timeout);
        };
    }, [text, speed, delay]);

    return (
        <span
            className={`font-mono inline-block cursor-default ${className}`}
            onMouseEnter={startAnimation}
        >
            {displayText}
        </span>
    );
}
