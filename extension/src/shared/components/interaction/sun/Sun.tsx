import { Component, onMount, createSignal } from "solid-js";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import "./Sun.scss";

interface SunProps {
  onSkip: () => void;
  onSwipeDown: () => void;
  onSwipeUp: () => void;
  onStartBackgroundAnimation?: (direction: 'up' | 'down') => void;
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
}

export const Sun: Component<SunProps> = (props) => {
  let sunEl: HTMLDivElement;
  const [getDragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [getOpacity, setOpacity] = createSignal(1);
  const [getScale, setScale] = createSignal(1);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getIsAnimating, setIsAnimating] = createSignal(false);
  const [getTapCount, setTapCount] = createSignal(0);
  
  let tapTimer: number | null = null;
  let startPos = { x: 0, y: 0 };
  let animationFrame: number;

  const getSunSize = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1024) {
      return { size: 110, baseScale: 1.2 };
    } else if (screenWidth >= 768) {
      return { size: 95, baseScale: 1.1 };
    } else {
      return { size: 85, baseScale: 1.0 };
    }
  };

  onMount(() => {
    if (IS_ANDROID) {
      window.focus();
    }
    setupDragHandlers();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (tapTimer) {
        clearTimeout(tapTimer);
      }
    };
  });

  const setupDragHandlers = () => {
    if (!sunEl) return;

    let isDragIntent = false;
    let touchStartTime = 0;
    
    const handleStart = (clientX: number, clientY: number) => {
      touchStartTime = Date.now();
      isDragIntent = false;
      startPos = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;
      
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (moveDistance > 10 && !isDragIntent) {
        isDragIntent = true;
        setIsDragging(true);
      }
      
      if (!getIsDragging()) return;
      
      setDragOffset({ x: deltaX, y: deltaY });
      
      // Calculate drag progress as a percentage of screen height
      const screenHeight = window.innerHeight;
      const maxDragDistance = screenHeight * 0.4; // 40% of screen height for full effect
      const dragProgress = Math.min(Math.abs(deltaY) / maxDragDistance, 1);
      
      // Always emit drag progress, even for small movements
      const direction = deltaY > 0 ? 'down' : 'up';
      const intensity = dragProgress; // Use full 0-1 range
      
      const event = new CustomEvent('dragProgress', { 
        detail: { direction, intensity, isDragging: true }
      });
      window.dispatchEvent(event);
      
      if (deltaY < 0) {
        const scaleEffect = 1 - (dragProgress * 0.3);
        const opacityEffect = 1 - (dragProgress * 0.5);
        setScale(Math.max(0.7, scaleEffect));
        setOpacity(Math.max(0.5, opacityEffect));
      } else {
        const scaleEffect = 1 + (dragProgress * 1.5);
        setOpacity(1);
        setScale(Math.min(2.5, scaleEffect));
      }
    };

    const handleEnd = () => {
      const duration = Date.now() - touchStartTime;
      const offset = getDragOffset();
      
      if (!isDragIntent && duration < 300 && Math.abs(offset.x) < 10 && Math.abs(offset.y) < 10) {
        handleTap();
        setIsDragging(false);
        return;
      }
      
      const dragThreshold = props.dragThreshold || 0.3; // Default 30% threshold
      const screenHeight = window.innerHeight;
      const completionThreshold = screenHeight * 0.4 * dragThreshold; // Threshold based on percentage
      
      setIsDragging(false);
      
      const clearEvent = new CustomEvent('dragProgress', { 
        detail: { direction: 'none', intensity: 0, isDragging: false }
      });
      window.dispatchEvent(clearEvent);
      
      // Calculate actual drag progress for threshold check
      const maxDragDistance = screenHeight * 0.4;
      const actualProgress = Math.abs(offset.y) / maxDragDistance;
      
      if (actualProgress >= dragThreshold) {
        const direction = offset.y > 0 ? 'down' : 'up';
        props.onStartBackgroundAnimation?.(direction);
        animateToCompletion(direction);
      } else {
        const resetEvent = new CustomEvent('dragProgress', { 
          detail: { direction: 'none', intensity: 0, isDragging: false, resetToInitial: true }
        });
        window.dispatchEvent(resetEvent);
        animateSnapBack();
      }
    };

    const handleTap = () => {
      const currentTapCount = getTapCount() + 1;
      setTapCount(currentTapCount);
      
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
      
      if (currentTapCount >= 5) {
        props.onSkip();
        setTapCount(0);
      } else {
        tapTimer = window.setTimeout(() => {
          setTapCount(0);
        }, 800);
      }
    };

    const animateSnapBack = () => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      
      const duration = 600;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const currentX = startOffset.x * (1 - easeOut);
        const currentY = startOffset.y * (1 - easeOut);
        setDragOffset({ x: currentX, y: currentY });
        
        const currentScale = startScale + (1 - startScale) * easeOut;
        setScale(currentScale);
        
        const currentOpacity = startOpacity + (1 - startOpacity) * easeOut;
        setOpacity(currentOpacity);
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      animate();
    };

    const animateToCompletion = (direction: 'up' | 'down') => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      
      const targetY = direction === 'down' ? window.innerHeight : -window.innerHeight;
      const targetScale = direction === 'down' ? 5.0 : 0.3;
      const targetOpacity = direction === 'up' ? 0.2 : 1;
      
      const duration = 3000;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOut = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const currentY = startOffset.y + (targetY - startOffset.y) * easeInOut;
        setDragOffset({ x: startOffset.x, y: currentY });
        
        const currentScale = startScale + (targetScale - startScale) * easeInOut;
        setScale(currentScale);
        
        const currentOpacity = startOpacity + (targetOpacity - startOpacity) * easeInOut;
        setOpacity(currentOpacity);
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          if (direction === 'down') {
            props.onSwipeDown();
          } else {
            props.onSwipeUp();
          }
        }
      };
      
      animate();
    };

    sunEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    });

    sunEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    });

    sunEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    });

    sunEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);
      
      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };
      
      const handleMouseUp = () => {
        handleEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  };

  const sunSize = getSunSize();

  return (
    <div
      ref={sunEl!}
      class="minded-sun"
      style={{
        transform: `translate(${getDragOffset().x}px, ${getDragOffset().y}px) scale(${sunSize.baseScale * getScale()})`,
        opacity: getOpacity(),
        transition: (getIsDragging() || getIsAnimating()) ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        width: `${sunSize.size}px`,
        height: `${sunSize.size}px`,
      }}
    >
      <div class="tap-indicator" classList={{ active: getTapCount() > 0 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div class="tap-dot" classList={{ filled: i <= getTapCount() }}></div>
        ))}
      </div>
    </div>
  );
};

export default Sun;