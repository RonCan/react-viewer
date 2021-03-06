import BaseConnector from './BaseConnector';
import {
  selectReaderCurrent,
  selectReaderCurrentContentIndex,
  selectReaderSetting,
} from '../../redux/selector';
import { updateCurrent } from '../../redux/action';
import CalculationsConnector from './CalculationsConnector';
import { FOOTER_INDEX } from '../../constants/CalculationsConstants';
import ReaderJsHelper from '../ReaderJsHelper';
import { READERJS_CONTENT_WRAPPER, ViewType, EMPTY_READ_LOCATION } from '../../constants/SettingConstants';

class CurrentConnector extends BaseConnector {
  constructor() {
    super();
    this.readerJsHelper = null;
  }

  setReaderJs() {
    const { viewType } = selectReaderSetting(this.getState());
    if (this.readerJsHelper) {
      this.readerJsHelper.unmount();
      this.readerJsHelper = null;
    }
    const node = document.querySelector(`.${READERJS_CONTENT_WRAPPER}`);
    if (node) {
      this.readerJsHelper = new ReaderJsHelper(node, viewType === ViewType.SCROLL);
      const location = this.readerJsHelper.getNodeLocationOfCurrentPage();
      this.dispatch(updateCurrent({ location }));
    }
  }

  updateCurrentOffset(offset) {
    const { viewType } = selectReaderSetting(this.getState());
    const contentIndex = CalculationsConnector.getIndexAtOffset(offset);

    const total = CalculationsConnector.getContentTotal(contentIndex);
    const position = (offset - CalculationsConnector.getStartOffset(contentIndex)) / total;
    let location = EMPTY_READ_LOCATION;
    if (this.readerJsHelper) {
      location = this.readerJsHelper.getNodeLocationOfCurrentPage();
    }

    this.dispatch(updateCurrent({
      contentIndex,
      offset,
      position,
      viewType,
      location,
    }));
  }

  restoreCurrentOffset() {
    const { viewType } = selectReaderSetting(this.getState());
    const { position, contentIndex, offset } = selectReaderCurrent(this.getState());

    if (!CalculationsConnector.isContentCalculated(contentIndex)) return;

    const total = CalculationsConnector.getContentTotal(contentIndex);
    const maxOffset = CalculationsConnector.getStartOffset(contentIndex) + (total - 1);
    const newOffset = Math.min(Math.round(position * total) + CalculationsConnector.getStartOffset(contentIndex), maxOffset);
    if (newOffset !== offset) {
      this.dispatch(updateCurrent({ offset: newOffset, viewType }));
    }
  }

  isOnFooter() {
    if (!CalculationsConnector.getHasFooter()) return false;
    if (!CalculationsConnector.isCompleted()) return false;

    const currentContentIndex = selectReaderCurrentContentIndex(this.getState());
    return currentContentIndex === FOOTER_INDEX;
  }
}

export default new CurrentConnector();
