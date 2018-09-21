import DOMEventConstants from '../../constants/DOMEventConstants';
import { screenHeight, scrollBy } from '../BrowserWrapper';
import {
  allowScrollEvent,
  preventScrollEvent,
  addEventListener,
  removeEventListener,
  CustomEvent,
} from '../EventHandler';

export default class ReaderGestureEventHandler {
  static EVENT_TYPE = {
    Touch: 'ReaderTouch',
    SelectionStart: 'ReaderSelectionStart',
    SelectionExpand: 'ReaderSelectionExpand',
    SelectionEnd: 'ReaderSelectionEnd',
  };
  static DELAY_FOR_TOUCHMOVE = 300;
  static SCROLLING_EDGE = 60;
  static SCROLLING_AMOUNT = 120;

  constructor(element) {
    this.element = element;

    this.start = this.start.bind(this);
    this.move = this.move.bind(this);
    this.end = this.end.bind(this);
    this.init();
  }

  static isTouchEvent(event) {
    return ([
      DOMEventConstants.TOUCH_START,
      DOMEventConstants.TOUCH_MOVE,
      DOMEventConstants.TOUCH_END,
      DOMEventConstants.TOUCH_CANCEL,
    ].includes(event.type));
  }

  static getPoint(event) {
    const { clientX, clientY, pageX, pageY } = ReaderGestureEventHandler.isTouchEvent(event) ? event.changedTouches[0] : event;
    return { clientX, clientY, pageX, pageY };
  }

  static scrollingInEdge(event) {
    const { clientY: y } = ReaderGestureEventHandler.getPoint(event);
    const halfHeight = screenHeight() / 2;
    const normalizedY = halfHeight - Math.abs(halfHeight - y);
    if (normalizedY < ReaderGestureEventHandler.SCROLLING_EDGE) {
      scrollBy({ top: ReaderGestureEventHandler.SCROLLING_AMOUNT * (y > halfHeight ? 1 : -1), behavior: 'smooth' });
    }
  }

  init() {
    this.isTouchMode = false;
    this.isSelectMode = false;
    this.isStarted = false;
    this.isMoved = false;
    this.startTime = null;
    this.startPoint = {};
    this.preventScrollEvent = false;
  }

  emitEvent(type, originalEvent, details = {}) {
    const currentPoint = ReaderGestureEventHandler.getPoint(originalEvent);
    const event = new CustomEvent(type, {
      detail: {
        originalEvent,
        startPoint: { x: this.startPoint.pageX, y: this.startPoint.pageY },
        currentPoint: { x: currentPoint.pageX, y: currentPoint.pageY },
        ...details,
      },
    });
    this.element.dispatchEvent(event);
  }

  ignoreEvent(event) {
    return (this.isTouchMode ^ ReaderGestureEventHandler.isTouchEvent(event)) === 1;
  }

  enterSelectionMode() {
    if(!this.isMoved && (
      (this.isTouchMode&& Date.now() - this.startTime >= ReaderGestureEventHandler.DELAY_FOR_TOUCHMOVE)
      || (!this.isTouchMode)
    )) {
      this.isSelectMode = true;
      event.preventDefault();
      if (this.isTouchMode) {
        preventScrollEvent(this.element);
      }
      this.emitEvent(ReaderGestureEventHandler.EVENT_TYPE.SelectionStart, event);
    }
  }

  start(event) {
    this.isTouchMode = event.type === DOMEventConstants.TOUCH_START;
    this.startPoint = ReaderGestureEventHandler.getPoint(event);
    this.startTime = Date.now();
    this.isStarted = true;
  }

  move(event) {
    if (!this.isStarted || this.ignoreEvent(event)) return;

    this.enterSelectionMode(event);
    if (this.isSelectMode) {
      ReaderGestureEventHandler.scrollingInEdge({ top: ReaderGestureEventHandler.SCROLLING_AMOUNT, behavior: 'smooth' });
      this.emitEvent(ReaderGestureEventHandler.EVENT_TYPE.SelectionExpand, event);
    }
    this.isMoved = true;
  }

  end(event) {
    if (!this.isStarted || this.ignoreEvent(event)) return;

    if (!this.isMoved) {
      this.emitEvent(ReaderGestureEventHandler.EVENT_TYPE.Touch, event);
    } else if (this.isSelectMode) {
      this.emitEvent(ReaderGestureEventHandler.EVENT_TYPE.SelectionEnd, event);
      allowScrollEvent(this.element);
    }
    this.init();
  }

  attach() {
    addEventListener(this.element, DOMEventConstants.TOUCH_START, this.start);
    addEventListener(this.element, DOMEventConstants.TOUCH_MOVE, this.move);
    addEventListener(this.element, DOMEventConstants.TOUCH_END, this.end);
    addEventListener(this.element, DOMEventConstants.TOUCH_CANCEL, this.end);
    addEventListener(this.element, DOMEventConstants.MOUSE_DOWN, this.start);
    addEventListener(this.element, DOMEventConstants.MOUSE_MOVE, this.move);
    addEventListener(this.element, DOMEventConstants.MOUSE_UP, this.end);

    // prevent entering to selection mode and default context menu
    this.element.oncontextmenu = () => false;
    this.element.onselectstart = ({ target }) => (target && target.tagName ? target.tagName.toLowerCase() === 'textarea' : false);
    this.element.ondragstart = () => false;
  }

  detach() {
    removeEventListener(this.element, DOMEventConstants.TOUCH_START, this.start);
    removeEventListener(this.element, DOMEventConstants.TOUCH_MOVE, this.move);
    removeEventListener(this.element, DOMEventConstants.TOUCH_END, this.end);
    removeEventListener(this.element, DOMEventConstants.TOUCH_CANCEL, this.end);
    removeEventListener(this.element, DOMEventConstants.MOUSE_DOWN, this.start);
    removeEventListener(this.element, DOMEventConstants.MOUSE_MOVE, this.move);
    removeEventListener(this.element, DOMEventConstants.MOUSE_UP, this.end);
  }
}