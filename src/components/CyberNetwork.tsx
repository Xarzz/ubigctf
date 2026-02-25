"use client";

import { useEffect, useRef } from "react";

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export function CyberNetwork() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", handleResize);

        const nodes: Node[] = [];
        // Responsive amount of nodes based on screen size
        const numNodes = Math.floor((width * height) / 12000);

        for (let i = 0; i < numNodes; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                radius: Math.random() * 2 + 1,
            });
        }

        const mouse = { x: -1000, y: -1000 };
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseleave", handleMouseLeave);

        const draw = () => {
            // Slight trailing effect for the particles
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off edges smoothly
                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(220, 38, 38, 0.4)"; // Crimson red
                ctx.fill();

                // Connect to other nearby nodes
                for (let j = i + 1; j < nodes.length; j++) {
                    const other = nodes[j];
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(220, 38, 38, ${0.15 * (1 - dist / 120)})`;
                        ctx.stroke();
                    }
                }

                // Connect to mouse cursor
                const dxMouse = node.x - mouse.x;
                const dyMouse = node.y - mouse.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distMouse < 250) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    // Brighter line towards the mouse
                    ctx.strokeStyle = `rgba(220, 38, 38, ${0.4 * (1 - distMouse / 250)})`;
                    ctx.stroke();

                    // Magnetic pull effect towards the mouse!
                    node.vx -= (dxMouse / distMouse) * 0.05;
                    node.vy -= (dyMouse / distMouse) * 0.05;

                    // Speed limit to prevent chaos
                    const currentSpeed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                    if (currentSpeed > 2.5) {
                        node.vx = (node.vx / currentSpeed) * 2.5;
                        node.vy = (node.vy / currentSpeed) * 2.5;
                    }
                }
            }
            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0 opacity-60 mix-blend-screen"
        />
    );
}
