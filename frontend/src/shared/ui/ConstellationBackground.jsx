import React, { useEffect, useRef } from 'react';

const PARTICLE_COLORS = ['#FF6B35', '#FFFFFF', '#FF8C61', '#E8E8E8'];
const PARTICLE_LINK_DISTANCE = 150;
const PARTICLE_MOUSE_RADIUS = 180;

const createParticle = (canvas) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    baseVx: (Math.random() - 0.5) * 0.5,
    baseVy: (Math.random() - 0.5) * 0.5,
    vx: 0,
    vy: 0,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
});

const drawParticle = (ctx, particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
};

const updateParticle = (particle, canvas, mouse) => {
    if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            particle.vx -= dx * force * 0.05;
            particle.vy -= dy * force * 0.05;
        }
    }

    particle.vx *= 0.95;
    particle.vy *= 0.95;

    particle.x += particle.vx + particle.baseVx;
    particle.y += particle.vy + particle.baseVy;

    if (particle.x < 0 || particle.x > canvas.width) particle.baseVx *= -1;
    if (particle.y < 0 || particle.y > canvas.height) particle.baseVy *= -1;
};

const connectParticles = (ctx, particles, theme) => {
    for (let a = 0; a < particles.length; a += 1) {
        for (let b = a + 1; b < particles.length; b += 1) {
            const dx = particles[a].x - particles[b].x;
            const dy = particles[a].y - particles[b].y;
            const distance = dx * dx + dy * dy;

            if (distance < PARTICLE_LINK_DISTANCE * PARTICLE_LINK_DISTANCE) {
                ctx.beginPath();
                const opacity = 1 - Math.sqrt(distance) / PARTICLE_LINK_DISTANCE;
                ctx.strokeStyle =
                    theme === 'dark'
                        ? `rgba(255, 107, 53, ${opacity * 0.5})`
                        : `rgba(84, 165, 123, ${opacity * 0.2})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
    }
};

const ConstellationBackground = ({ theme = 'dark' }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        const mouse = { x: null, y: null, radius: PARTICLE_MOUSE_RADIUS };

        const init = () => {
            particles = [];
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

            for (let index = 0; index < particleCount; index += 1) {
                particles.push(createParticle(canvas));
            }
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((particle) => {
                updateParticle(particle, canvas, mouse);
                drawParticle(ctx, particle);
            });
            connectParticles(ctx, particles, theme);
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };

        const handleMouseOut = () => {
            mouse.x = null;
            mouse.y = null;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 transform-gpu"
            style={{
                opacity: theme === 'dark' ? 0.6 : 0.3,
                willChange: 'opacity',
            }}
        />
    );
};

export default ConstellationBackground;
