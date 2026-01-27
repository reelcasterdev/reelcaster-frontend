'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface CurrentData {
  speed: number; // km/h
  direction: number; // degrees (0-360)
}

interface OceanCurrentLayerProps {
  currentData: CurrentData;
  width: number;
  height: number;
  enabled: boolean;
  particleCount?: number;
  particleSpeed?: number;
  particleLife?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  speed: number;
  angle: number;
  isOverWater: boolean;
  trail: { x: number; y: number }[];
}

const MAX_TRAIL_LENGTH = 12;

const OceanCurrentLayer: React.FC<OceanCurrentLayerProps> = ({
  currentData,
  width,
  height,
  enabled,
  particleCount = 150,
  particleSpeed = 1.5,
  particleLife = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Convert current direction to radians
  // Ocean current direction = direction current is flowing TO
  const getCurrentAngle = useCallback((direction: number): number => {
    return (direction * Math.PI) / 180;
  }, []);

  // Get color based on current speed (cyan/teal palette)
  const getCurrentColor = useCallback((speed: number): string => {
    if (speed < 0.5) return 'rgba(150, 220, 230, '; // Light cyan - very slow
    if (speed < 1.0) return 'rgba(100, 210, 220, '; // Cyan - slow
    if (speed < 2.0) return 'rgba(50, 200, 210, ';  // Teal-cyan - moderate
    if (speed < 3.0) return 'rgba(30, 180, 190, ';  // Teal - strong
    return 'rgba(20, 160, 175, ';                     // Deep teal - very strong
  }, []);

  // Water detection heuristic (same as wind-particle-layer)
  const isLikelyOverWater = useCallback((x: number, y: number): boolean => {
    const centerX = width / 2;
    const centerY = height / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
    const normalizedDistance = distanceFromCenter / maxDistance;
    const waterProbability = 1 - (normalizedDistance * 0.7);
    const gridX = Math.floor(x / 40);
    const gridY = Math.floor(y / 40);
    const seed = (gridX * 73 + gridY * 179) % 100 / 100;
    return seed < waterProbability;
  }, [width, height]);

  // Initialize particles
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = [];
    const angle = getCurrentAngle(currentData.direction);
    // Ocean currents are much slower than wind, scale accordingly
    const speed = currentData.speed * particleSpeed * 0.15;

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * particleLife,
        maxLife: particleLife,
        speed: currentData.speed,
        angle,
        isOverWater: isLikelyOverWater(x, y),
        trail: [],
      });
    }

    particlesRef.current = particles;
  }, [currentData, width, height, particleCount, particleSpeed, particleLife, getCurrentAngle, isLikelyOverWater]);

  // Update particle
  const updateParticle = useCallback((particle: Particle): void => {
    // Store current position in trail
    if (particle.isOverWater) {
      particle.trail.push({ x: particle.x, y: particle.y });
      if (particle.trail.length > MAX_TRAIL_LENGTH) {
        particle.trail.shift();
      }
    }

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life--;

    // Wrap around edges
    if (particle.x < 0) { particle.x = width; particle.trail = []; }
    if (particle.x > width) { particle.x = 0; particle.trail = []; }
    if (particle.y < 0) { particle.y = height; particle.trail = []; }
    if (particle.y > height) { particle.y = 0; particle.trail = []; }

    particle.isOverWater = isLikelyOverWater(particle.x, particle.y);

    // Reset particle if life expired
    if (particle.life <= 0) {
      const newX = Math.random() * width;
      const newY = Math.random() * height;
      particle.x = newX;
      particle.y = newY;
      particle.life = particle.maxLife;
      particle.isOverWater = isLikelyOverWater(newX, newY);
      particle.trail = [];
    }
  }, [width, height, isLikelyOverWater]);

  // Draw particle as fading streamline
  const drawParticle = useCallback((
    ctx: CanvasRenderingContext2D,
    particle: Particle
  ): void => {
    if (!particle.isOverWater || particle.trail.length < 2) return;

    const lifeAlpha = particle.life / particle.maxLife;
    const color = getCurrentColor(particle.speed);

    // Draw fading streamline trail
    for (let i = 1; i < particle.trail.length; i++) {
      const prev = particle.trail[i - 1];
      const curr = particle.trail[i];
      const segmentAlpha = (i / particle.trail.length) * lifeAlpha * 0.6;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `${color}${segmentAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw head dot
    const lastTrail = particle.trail[particle.trail.length - 1];
    ctx.beginPath();
    ctx.arc(lastTrail.x, lastTrail.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `${color}${lifeAlpha * 0.8})`;
    ctx.fill();
  }, [getCurrentColor]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    particlesRef.current.forEach((particle) => {
      updateParticle(particle);
      drawParticle(ctx, particle);
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enabled, width, height, updateParticle, drawParticle]);

  // Initialize and start animation
  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
      }
      return;
    }

    initializeParticles();
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, initializeParticles, animate, width, height]);

  // Update particles when current data changes
  useEffect(() => {
    if (!enabled) return;

    const angle = getCurrentAngle(currentData.direction);
    const speed = currentData.speed * particleSpeed * 0.15;

    particlesRef.current.forEach((particle) => {
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.speed = currentData.speed;
      particle.angle = angle;
    });
  }, [currentData, enabled, particleSpeed, getCurrentAngle]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 11,
        backgroundColor: 'transparent',
      }}
    />
  );
};

export default OceanCurrentLayer;
