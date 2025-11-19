'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface WindData {
  windSpeed: number; // km/h
  windDirection: number; // degrees (0-360)
}

interface WindParticleLayerProps {
  windData: WindData;
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
}

const WindParticleLayer: React.FC<WindParticleLayerProps> = ({
  windData,
  width,
  height,
  enabled,
  particleCount = 2000,
  particleSpeed = 2,
  particleLife = 100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const waterCheckCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Convert wind direction (meteorological) to radians
  // Meteorological: direction wind is coming FROM
  // We need: direction wind is going TO (add 180 degrees)
  const getWindAngle = useCallback((direction: number): number => {
    const toDirection = (direction + 180) % 360;
    return (toDirection * Math.PI) / 180;
  }, []);

  // Get color based on wind speed (lighter colors)
  const getWindColor = useCallback((speed: number): string => {
    if (speed < 10) return 'rgba(200, 255, 200, '; // Very light green - calm
    if (speed < 20) return 'rgba(180, 230, 255, '; // Very light blue - gentle
    if (speed < 30) return 'rgba(255, 255, 200, '; // Light yellow - moderate
    if (speed < 40) return 'rgba(255, 220, 180, '; // Light orange - strong
    return 'rgba(255, 200, 200, '; // Light red - very strong
  }, []);

  // Better water detection - focus particles toward center (water areas)
  // and use distance-based heuristic to avoid land edges
  const isLikelyOverWater = useCallback((x: number, y: number): boolean => {
    // Calculate distance from center of map (which is typically over water)
    const centerX = width / 2;
    const centerY = height / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    // Maximum distance to edge
    const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));

    // Normalize distance (0 at center, 1 at edges)
    const normalizedDistance = distanceFromCenter / maxDistance;

    // Higher chance of water near center, lower at edges
    // This creates a gradient effect
    const waterProbability = 1 - (normalizedDistance * 0.7); // 100% at center, 30% at edges

    // Add some randomness for natural look, but weighted by distance
    const gridX = Math.floor(x / 40);
    const gridY = Math.floor(y / 40);
    const seed = (gridX * 73 + gridY * 179) % 100 / 100;

    return seed < waterProbability;
  }, [width, height]);

  // Initialize particles
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = [];
    const angle = getWindAngle(windData.windDirection);
    const speed = windData.windSpeed * particleSpeed * 0.05;

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
        speed: windData.windSpeed,
        angle,
        isOverWater: isLikelyOverWater(x, y),
      });
    }

    particlesRef.current = particles;
  }, [windData, width, height, particleCount, particleSpeed, particleLife, getWindAngle, isLikelyOverWater]);

  // Update particle
  const updateParticle = useCallback((particle: Particle): void => {
    // Move the arrow in wind direction
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life--;

    // Wrap around edges
    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;

    // Check if still over water
    particle.isOverWater = isLikelyOverWater(particle.x, particle.y);

    // Reset particle if life expired
    if (particle.life <= 0) {
      const newX = Math.random() * width;
      const newY = Math.random() * height;
      particle.x = newX;
      particle.y = newY;
      particle.life = particle.maxLife;
      particle.isOverWater = isLikelyOverWater(newX, newY);
    }
  }, [width, height, isLikelyOverWater]);

  // Draw particle as arrow with tail
  const drawParticle = useCallback((
    ctx: CanvasRenderingContext2D,
    particle: Particle
  ): void => {
    // Only draw if over water
    if (!particle.isOverWater) return;

    const alpha = particle.life / particle.maxLife;
    const color = getWindColor(particle.speed);

    // Arrow length based on wind speed (longer arrows = stronger wind)
    const baseLength = 16; // Moderate size - visible but not overwhelming
    const speedFactor = Math.min(particle.speed / 40, 1.5); // Cap at 1.5x
    const arrowLength = baseLength * (0.5 + speedFactor);

    // Tail length based on wind speed (longer tail = stronger wind)
    const baseTailLength = 10; // Moderate tail length
    const tailSpeedFactor = Math.min(particle.speed / 30, 2); // Up to 2x for strong winds
    const tailLength = baseTailLength * tailSpeedFactor;

    // Arrow width
    const arrowWidth = 2; // Moderate width - clearly visible
    const headLength = arrowLength * 0.3;
    const headWidth = arrowWidth * 3; // Proportional head width

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);

    // Draw tail (behind the arrow) with gradient fade
    if (tailLength > 0) {
      const gradient = ctx.createLinearGradient(-arrowLength / 2 - tailLength, 0, -arrowLength / 2, 0);
      gradient.addColorStop(0, `${color}0)`); // Fully transparent at tail end
      gradient.addColorStop(1, `${color}${alpha * 0.3})`); // Semi-transparent at arrow start

      ctx.strokeStyle = gradient;
      ctx.lineWidth = arrowWidth; // Match arrow width for consistency
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-arrowLength / 2 - tailLength, 0);
      ctx.lineTo(-arrowLength / 2, 0);
      ctx.stroke();
    }

    // Draw arrow shaft
    ctx.strokeStyle = `${color}${alpha * 0.8})`;
    ctx.lineWidth = arrowWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-arrowLength / 2, 0);
    ctx.lineTo(arrowLength / 2, 0);
    ctx.stroke();

    // Draw arrow head
    ctx.fillStyle = `${color}${alpha * 0.9})`;
    ctx.beginPath();
    ctx.moveTo(arrowLength / 2, 0);
    ctx.lineTo(arrowLength / 2 - headLength, -headWidth);
    ctx.lineTo(arrowLength / 2 - headLength, headWidth);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [getWindColor]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas completely for transparent background
    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    particlesRef.current.forEach((particle) => {
      updateParticle(particle);
      drawParticle(ctx, particle);
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enabled, width, height, updateParticle, drawParticle]);

  // Initialize and start animation
  useEffect(() => {
    if (!enabled) {
      // Clear canvas when disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          ctx.fillRect(0, 0, width, height);
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

  // Update particles when wind data changes
  useEffect(() => {
    if (!enabled) return;

    const angle = getWindAngle(windData.windDirection);
    const speed = windData.windSpeed * particleSpeed * 0.05;

    particlesRef.current.forEach((particle) => {
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.speed = windData.windSpeed;
      particle.angle = angle;
    });
  }, [windData, enabled, particleSpeed, getWindAngle]);

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
        zIndex: 10,
        backgroundColor: 'transparent',
      }}
    />
  );
};

export default WindParticleLayer;
