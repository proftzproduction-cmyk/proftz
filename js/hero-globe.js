/**
 * PROFTZ Hero Globe Cinematic Canvas Engine
 * Handles 60fps GPU-accelerated animated network pulses, node breathing glow,
 * atmospheric rim bloom, and seamless slow Earth rotation for the new transparent globe.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('heroGlobeCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const globeImg = new Image();
    globeImg.src = 'public/globe.png';

    // Node definitions relative to the image dimensions (636 x 819)
    const rawNodes = [
        { x: 135, y: 240, label: 'EU' },
        { x: 250, y: 200, label: 'EE' },
        { x: 360, y: 390, label: 'ME' },
        { x: 440, y: 470, label: 'IN' },
        { x: 510, y: 380, label: 'EA' },
        { x: 240, y: 450, label: 'AF' },
        { x: 110, y: 440, label: 'WA' },
        { x: 210, y: 650, label: 'SA' },
        { x: 320, y: 720, label: 'SO' },
        { x: 90,  y: 150, label: 'NA' }
    ];

    // Connection paths between nodes (index pairs with control curve height offset)
    const connections = [
        { from: 0, to: 1, curve: -15 },
        { from: 1, to: 2, curve: 20 },
        { from: 2, to: 3, curve: -25 },
        { from: 3, to: 4, curve: 15 },
        { from: 0, to: 5, curve: -30 },
        { from: 5, to: 2, curve: 10 },
        { from: 5, to: 6, curve: 15 },
        { from: 5, to: 7, curve: -20 },
        { from: 7, to: 8, curve: 25 },
        { from: 3, to: 8, curve: -30 },
        { from: 9, to: 0, curve: 15 },
        { from: 6, to: 7, curve: -10 }
    ];

    // Initialize network pulses
    const pulses = connections.map((conn, i) => ({
        connIndex: i,
        progress: (i * 0.12) % 1.0, // Staggered start times
        speed: 0.003 + (i % 3) * 0.0012, // Natural variations in pulse speed
        size: 3.5 + (i % 2) * 1.0,
        color: i % 3 === 0 ? '#5ded37' : '#ffd700' // Emerald or Copper/Gold pulse
    }));

    let animationFrameId = null;
    let startTime = null;
    const LOOP_DURATION = 9000; // 9-second seamless loop

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mediaQuery.matches;

    mediaQuery.addEventListener('change', (e) => {
        isReducedMotion = e.matches;
        if (isReducedMotion) {
            renderStatic();
        } else {
            requestAnimationFrame(animate);
        }
    });

    function setupCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    globeImg.onload = () => {
        setupCanvasSize();
        if (isReducedMotion) {
            renderStatic();
        } else {
            requestAnimationFrame(animate);
        }
    };

    window.addEventListener('resize', () => {
        if (!canvas) return;
        setupCanvasSize();
        if (isReducedMotion) renderStatic();
    });

    function getControlPoint(p1, p2, curveOffset) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        return {
            x: midX + nx * curveOffset,
            y: midY + ny * curveOffset
        };
    }

    function getQuadraticBezierPoint(p0, p1, p2, t) {
        const oneMinusT = 1 - t;
        return {
            x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
            y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
        };
    }

    function renderStatic() {
        if (!globeImg.complete) return;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(globeImg, 0, 0, w, h);
    }

    function animate(timestamp) {
        if (isReducedMotion) return;
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const loopTime = elapsed % LOOP_DURATION;
        const loopPhase = (loopTime / LOOP_DURATION) * Math.PI * 2;

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        if (w === 0 || h === 0) {
            animationFrameId = requestAnimationFrame(animate);
            return;
        }

        ctx.clearRect(0, 0, w, h);

        // Scale factors relative to original image size (636 x 819)
        const scaleX = w / 636;
        const scaleY = h / 819;

        // Subtle micro floating transform for Earth rotation feel
        const floatY = Math.sin(loopPhase) * 3;
        const floatX = Math.cos(loopPhase * 0.5) * 2;
        const scalePulse = 1.0 + Math.sin(loopPhase) * 0.008;

        ctx.save();
        ctx.translate(w / 2 + floatX, h / 2 + floatY);
        ctx.scale(scalePulse, scalePulse);
        ctx.translate(-w / 2, -h / 2);

        // 1. Draw Transparent Earth Base Image
        ctx.drawImage(globeImg, 0, 0, w, h);

        // Map nodes to canvas coordinates
        const scaledNodes = rawNodes.map(n => ({
            x: n.x * scaleX,
            y: n.y * scaleY
        }));

        // 2. Animate Node Breathing Glow
        scaledNodes.forEach((node, idx) => {
            const breath = Math.sin(loopPhase * 2 + idx * 0.7) * 0.5 + 0.5;
            const radius = (3.5 + breath * 4.5) * Math.min(scaleX, scaleY);
            const glowOpacity = 0.4 + breath * 0.5;

            const radGrad = ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, radius * 2.8
            );
            radGrad.addColorStop(0, `rgba(93, 237, 55, ${glowOpacity})`);
            radGrad.addColorStop(0.4, `rgba(93, 237, 55, ${glowOpacity * 0.5})`);
            radGrad.addColorStop(1, 'rgba(93, 237, 55, 0)');

            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 2.8, 0, Math.PI * 2);
            ctx.fill();

            // Core emerald dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 1.8 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Animate Data Pulses along Network Lines
        pulses.forEach(pulse => {
            const conn = connections[pulse.connIndex];
            const p1 = scaledNodes[conn.from];
            const p2 = scaledNodes[conn.to];
            const ctrl = getControlPoint(p1, p2, conn.curve * Math.min(scaleX, scaleY));

            pulse.progress += pulse.speed;
            if (pulse.progress > 1.0) pulse.progress -= 1.0;

            const pos = getQuadraticBezierPoint(p1, ctrl, p2, pulse.progress);
            const pulseRadius = pulse.size * Math.min(scaleX, scaleY);

            // Pulse glow halo
            const pulseGrad = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, pulseRadius * 3
            );
            const isGold = pulse.color === '#ffd700';
            const colorRgb = isGold ? '255, 215, 0' : '93, 237, 55';

            pulseGrad.addColorStop(0, `rgba(${colorRgb}, 0.95)`);
            pulseGrad.addColorStop(0.5, `rgba(${colorRgb}, 0.4)`);
            pulseGrad.addColorStop(1, `rgba(${colorRgb}, 0)`);

            ctx.fillStyle = pulseGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pulseRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            // Bright inner core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pulseRadius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        animationFrameId = requestAnimationFrame(animate);
    }
});
