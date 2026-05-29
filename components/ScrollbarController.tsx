'use client';

import { useEffect, useRef } from 'react';

export default function ScrollbarController() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  
  // Keep track of values without causing heavy re-renders
  const stateRef = useRef({
    thumbHeight: 80,
    thumbTop: 0,
    isDragging: false,
    dragStartY: 0,
    dragStartScrollTop: 0,
    isNearRight: false,
    isScrolling: false,
    scrollTimeout: null as NodeJS.Timeout | null,
  });

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    function updateVisibility() {
      const show = stateRef.current.isNearRight || stateRef.current.isScrolling || stateRef.current.isDragging;
      if (track) {
        track.style.opacity = show ? '1' : '0';
        track.style.pointerEvents = show ? 'auto' : 'none';
      }
    }

    function updateScrollbarMetrics() {
      if (!thumb) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      if (scrollHeight <= clientHeight) {
        thumb.style.display = 'none';
        return;
      } else {
        thumb.style.display = 'block';
      }

      // Sizing ratio
      const viewRatio = clientHeight / scrollHeight;
      // Minimum height of 40px, max of 300px
      const calculatedHeight = Math.max(40, Math.min(clientHeight * viewRatio, 300));
      stateRef.current.thumbHeight = calculatedHeight;
      thumb.style.height = `${calculatedHeight}px`;

      // Scrollable track height: track height - thumb height
      const maxScrollTop = scrollHeight - clientHeight;
      const scrollRatio = scrollTop / maxScrollTop;

      const topPos = scrollRatio * (clientHeight - calculatedHeight);
      stateRef.current.thumbTop = topPos;
      
      // Use transform/translateY for hardware-accelerated composted layers
      thumb.style.transform = `translateY(${topPos}px)`;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rightEdgeThreshold = window.innerWidth - 30;
      const nearRight = e.clientX >= rightEdgeThreshold;

      if (nearRight !== stateRef.current.isNearRight) {
        stateRef.current.isNearRight = nearRight;
        updateVisibility();
      }
    };

    const handleScroll = () => {
      updateScrollbarMetrics();
      
      if (!stateRef.current.isScrolling) {
        stateRef.current.isScrolling = true;
        updateVisibility();
      }

      if (stateRef.current.scrollTimeout) {
        clearTimeout(stateRef.current.scrollTimeout);
      }
      stateRef.current.scrollTimeout = setTimeout(() => {
        stateRef.current.isScrolling = false;
        updateVisibility();
      }, 1000);
    };

    const handleResize = () => {
      updateScrollbarMetrics();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Drag starts on mousedown on thumb
    const handleThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stateRef.current.isDragging = true;
      stateRef.current.dragStartY = e.clientY;
      stateRef.current.dragStartScrollTop = window.scrollY || document.documentElement.scrollTop;
      updateVisibility();
      
      // Add aesthetic active state
      thumb.style.width = '8px';
      thumb.style.backgroundColor = '#83ff00';
    };

    thumb.addEventListener('mousedown', handleThumbMouseDown);

    // Global drag handlers
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return;
      e.preventDefault();

      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      if (maxScrollTop <= 0) return;

      const deltaY = e.clientY - stateRef.current.dragStartY;
      const scrollableTrackHeight = clientHeight - stateRef.current.thumbHeight;
      if (scrollableTrackHeight <= 0) return;

      const trackScrollRatio = deltaY / scrollableTrackHeight;
      const targetScrollTop = stateRef.current.dragStartScrollTop + trackScrollRatio * maxScrollTop;

      window.scrollTo(0, Math.max(0, Math.min(targetScrollTop, maxScrollTop)));
    };

    const handleGlobalMouseUp = () => {
      if (stateRef.current.isDragging) {
        stateRef.current.isDragging = false;
        
        // Reset style classes
        thumb.style.width = '';
        thumb.style.backgroundColor = '';
        
        updateVisibility();
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });

    // Initial sizing calculation
    updateScrollbarMetrics();
    updateVisibility();

    // Handle asynchronous content adjustments
    const timers = [100, 500, 1000, 2000].map(delay => 
      setTimeout(updateScrollbarMetrics, delay)
    );

    // Dynamic Mutation Observer
    const observer = new MutationObserver(updateScrollbarMetrics);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      thumb.removeEventListener('mousedown', handleThumbMouseDown);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      timers.forEach(clearTimeout);
      observer.disconnect();
      if (stateRef.current.scrollTimeout) {
        clearTimeout(stateRef.current.scrollTimeout);
      }
    };
  }, []);

  return (
    <div 
      ref={trackRef}
      className="fixed top-0 right-0 h-full w-2.5 z-[9999] pointer-events-none select-none transition-opacity duration-300"
      style={{ opacity: 0 }}
    >
      {/* Scrollbar Thumb */}
      <div 
        ref={thumbRef}
        className="absolute right-0.5 w-[6px] hover:w-[8px] bg-[#b3ff6b] hover:bg-[#83ff00] rounded-full cursor-pointer pointer-events-auto transition-all duration-150"
        style={{
          boxShadow: '0 0 6px rgba(131,255,0,0.4)',
          transform: 'translateY(0px)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
