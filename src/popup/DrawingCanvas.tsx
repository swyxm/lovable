import React, { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  onDrawingComplete: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onDrawingComplete,
  width = 300,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#333';

    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 10;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#333';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onDrawingComplete(dataUrl);
  };

  return (
    <div className="drawing-canvas-container">
      <div className="drawing-tools">
        <button
          className={`tool-button ${!isEraser ? 'active' : ''}`}
          onClick={() => setIsEraser(false)}
          aria-label="Draw with pen"
        >
          ✏️
        </button>
        <button
          className={`tool-button ${isEraser ? 'active' : ''}`}
          onClick={() => setIsEraser(true)}
          aria-label="Erase"
        >
          🧽
        </button>
        <button
          className="tool-button"
          onClick={clearCanvas}
          aria-label="Clear canvas"
        >
          🗑️
        </button>
        <button
          className="tool-button save-button"
          onClick={saveDrawing}
          aria-label="Save drawing"
        >
          ✅ Save
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="drawing-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          border: '2px solid #ddd',
          borderRadius: '10px',
          cursor: isDrawing ? 'crosshair' : 'pointer'
        }}
      />

      <p className="drawing-instructions">
        Draw your idea here! Click and drag to draw, then click "Save" when you're done.
      </p>
    </div>
  );
};

export default DrawingCanvas;
