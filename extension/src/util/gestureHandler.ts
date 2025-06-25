import { IS_TOUCH_PRIMARY } from "./touch";

export interface GestureHandlerOptions {
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  onTap?: (tapCount: number) => void;
  swipeThreshold?: number;
  tapThreshold?: number;
  tapTimeout?: number;
  maxTapCount?: number;
}

export class GestureHandler {
  private element: HTMLElement;
  private options: Required<GestureHandlerOptions>;
  private startY: number = 0;
  private startTime: number = 0;
  private tapCount: number = 0;
  private tapTimer: number | null = null;
  private isSwiping: boolean = false;
  private currentY: number = 0;

  constructor(element: HTMLElement, options: GestureHandlerOptions) {
    this.element = element;
    this.options = {
      onSwipeDown: options.onSwipeDown || (() => {}),
      onSwipeUp: options.onSwipeUp || (() => {}),
      onTap: options.onTap || (() => {}),
      swipeThreshold: options.swipeThreshold || 50,
      tapThreshold: options.tapThreshold || 10,
      tapTimeout: options.tapTimeout || 400,
      maxTapCount: options.maxTapCount || 4,
    };

    this.init();
  }

  private init() {
    if (IS_TOUCH_PRIMARY) {
      this.element.addEventListener("touchstart", this.handleStart, {
        passive: false,
      });
      this.element.addEventListener("touchmove", this.handleMove, {
        passive: false,
      });
      this.element.addEventListener("touchend", this.handleEnd, {
        passive: false,
      });
    } else {
      this.element.addEventListener("mousedown", this.handleStart);
      this.element.addEventListener("mousemove", this.handleMove);
      this.element.addEventListener("mouseup", this.handleEnd);
    }
  }

  private handleStart = (e: TouchEvent | MouseEvent) => {
    const y =
      IS_TOUCH_PRIMARY && "touches" in e
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;
    this.startY = y;
    this.currentY = y;
    this.startTime = Date.now();
    this.isSwiping = false;
  };

  private handleMove = (e: TouchEvent | MouseEvent) => {
    if (!this.startTime) return;

    const y =
      IS_TOUCH_PRIMARY && "touches" in e
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;
    this.currentY = y;
    const deltaY = Math.abs(y - this.startY);

    if (deltaY > this.options.tapThreshold) {
      this.isSwiping = true;
      this.resetTapCounter();
    }
  };

  private handleEnd = (e: TouchEvent | MouseEvent) => {
    if (!this.startTime) return;

    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const deltaY = this.currentY - this.startY;

    if (this.isSwiping && Math.abs(deltaY) > this.options.swipeThreshold) {
      if (deltaY > 0) {
        this.options.onSwipeDown();
      } else {
        this.options.onSwipeUp();
      }
      this.resetTapCounter();
    } else if (!this.isSwiping && duration < 200) {
      this.handleTap();
    }

    this.startTime = 0;
    this.isSwiping = false;
  };

  private handleTap() {
    this.tapCount++;

    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }

    this.options.onTap(this.tapCount);

    if (this.tapCount >= this.options.maxTapCount) {
      this.resetTapCounter();
    } else {
      this.tapTimer = window.setTimeout(() => {
        this.resetTapCounter();
      }, this.options.tapTimeout);
    }
  }

  private resetTapCounter() {
    this.tapCount = 0;
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
  }

  public destroy() {
    if (IS_TOUCH_PRIMARY) {
      this.element.removeEventListener("touchstart", this.handleStart);
      this.element.removeEventListener("touchmove", this.handleMove);
      this.element.removeEventListener("touchend", this.handleEnd);
    } else {
      this.element.removeEventListener("mousedown", this.handleStart);
      this.element.removeEventListener("mousemove", this.handleMove);
      this.element.removeEventListener("mouseup", this.handleEnd);
    }
    this.resetTapCounter();
  }
}
