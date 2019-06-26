// @flow

import React from 'react';
import CellMeasurerCache from "../CellMeasurer/CellMeasurerCache";
import CellMeasurer from "../CellMeasurer/CellMeasurer";
import * as ReactDOM from "react-dom";
import Message from "../Message/Message";
import { DEBOUNCING_TIMER, NOT_FOUND, OUT_OF_RANGE, CURRENT_ITEM_IN_VIEWPORT } from "../utils/value";
import debounce from "../utils/debounce";

type Props = {
  className?: string,
  id?: ?string,
  style?: mixed,
  height: number,
  preRenderCellCount: number,
  data: any,
  cellMeasurerCache: CellMeasurerCache,
};

class Masonry extends React.Component<Props> {
  constructor(props) {
    super(props);

    this.state = {
      isScrolling: false,
      scrollTop: 0,
    };

    /*
    * Scroll to bottom when the first loading
    */
    // Count number of render called.
    this.firstLoadingCount = 0;
    // Trigger is the first loading.
    this.isFirstLoading = true;

    // for add more above
    this._currentItemInViewport = new Map();
    this._oldDataLength = undefined;

    this._resizeMap = new Map();

    // A map stores `index -> itemId`
    this._mapIndexToId = new Map();

    // A map stores `itemId -> {index, height, position}`
    this._itemsMap = new Map();

    // Represents this element.
    this._masonry = undefined;

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.onChildrenChangeHeight = this.onChildrenChangeHeight.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);

    this.init();
  }

  init() {
    const { data, cellMeasurerCache: { defaultHeight } } = this.props;
    this._oldDataLength = data.length;
    data.forEach((item) => {
      this._updateItemOnMap(item.itemId, data.indexOf(item), defaultHeight, 0);
    });
    this._updateMapIndex(0, data.length);
  }

  componentDidMount() {
    const { data } = this.props;
    this._masonry = ReactDOM.findDOMNode(this);
    this._masonry.addEventListener('scroll', this._onScroll);
    window.addEventListener('resize', debounce(this._onResize, DEBOUNCING_TIMER));
    console.log(data);
    this._updateItemsPosition();
    console.log(this._itemsMap);
    this._masonry.firstChild.scrollIntoView(false);
  }

  componentWillUnmount() {
    this._masonry.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
  }

  render() {
    const {
      className,
      id,
      height,
      style,
      isScrolling,
      data,
      cellMeasurerCache
    } = this.props;

    const { scrollTop } = this.state;
    const estimateTotalHeight = this._getEstimatedTotalHeight();

    this._currentItemInViewport.set(CURRENT_ITEM_IN_VIEWPORT, {
      itemId: this._getItemIdFromPosition(scrollTop),
      disparity: scrollTop - this._itemsMap.get(this._getItemIdFromPosition(scrollTop)).position
    });

    // array item is rendered in the batch.
    const children = [];

    // number of items in viewport + overscan top + overscan bottom.
    const itemsInBatch = this._getItemsInBatch(scrollTop);

    // Scroll to bottom when the first loading
    if (this._masonry !== undefined && this.isFirstLoading === true) {
      this.firstLoadingCount++;
      this._scrollToItem(this._getItemIdFromIndex(data.length - 1), 0);
      if (this.firstLoadingCount - 1 >= itemsInBatch.length) {
        this.isFirstLoading = false;
      }
    }

    for (let i = 0; i <= itemsInBatch.length - 1; i++) {
      const index = this._getIndexFromId(itemsInBatch[i]);
      switch (typeof data[index]) {
        case "object": {
          const mess = new Message({
            id: data[index].itemId,
            userAvatarUrl: data[index].avatar,
            userName: data[index].userName,
            messageContent: data[index].msgContent,
            sentTime: data[index].timestamp
          });

          const cellMeasurer = new CellMeasurer({
            cache: cellMeasurerCache,
            id: data[index].itemId,
            position: { top: this._itemsMap.get(itemsInBatch[i]).position, left: 0 },
          });

          children.push(
            <CellMeasurer cache={cellMeasurer.getCache}
                          id={cellMeasurer.getCellId}
                          key={cellMeasurer.getCellId}
                          onChangedHeight={this.onChildrenChangeHeight}
                          position={cellMeasurer.getCellPosition}>
              <Message id={mess.getItemId}
                       key={mess.getItemId}
                       index={index}
                       userAvatarUrl={mess.getUserAvatarUrl}
                       userName={mess.getUserName}
                       messageContent={mess.getMessageContent}
                       sentTime={mess.getSentTime}
                       isMine={false}
                       onRemoveItem={this.onRemoveItem}/>
            </CellMeasurer>
          );
          break;
        }

        default: {
          break;
        }
      }
    }

    return (
      <div className={className}
           id={id}
           onScroll={this._onScroll}
           style={{
             backgroundColor: 'cornflowerblue',
             boxSizing: 'border-box',
             overflowX: 'hidden',
             overflowY: estimateTotalHeight < height ? 'hidden' : 'auto',
             width: 'auto',
             minWidth: '550px',
             minHeight: '500px',
             height: height,
             position: 'relative',
             willChange: 'transform',
             ...style
           }}>
        <div className="innerScrollContainer"
             style={{
               width: '100%',
               height: estimateTotalHeight,
               maxWidth: '100%',
               maxHeight: estimateTotalHeight,
               overflow: 'hidden',
               position: 'relative',
               pointerEvents: isScrolling ? 'none' : '', // property defines whether or not an element reacts to pointer events.
             }}>
          {children}
        </div>
      </div>
    );
  }

  componentDidUpdate() {
    const { data, cellMeasurerCache } = this.props;
    if (this._oldDataLength < data.length) {
      // update rendered maps when data has added more.
      data.forEach((item) => {
        if (!this._itemsMap.has(item.itemId)) {
          this._updateItemOnMap(item.itemId, data.indexOf(item), cellMeasurerCache.defaultHeight, 0);
        }
      });
      this._updateMapIndex(0, data.length);
      this._updateItemsPosition();
    }
    // check add or remove item above
    // remove
    if (this._oldDataLength !== data.length) {
      this._oldDataLength = data.length;
      this._scrollToItem(
        this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).itemId,
        this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).disparity
      );
    }
  }

  onChildrenChangeHeight(itemId: string, newHeight: number) {
    if (this._itemsMap.get(itemId).height !== newHeight) {
      this._updateItemsPositionWhenItemChangedHeight(itemId, newHeight);
      this._scrollToItem(this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).itemId,
        this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).disparity);
      this.forceUpdate();
    }
  }

  _onScroll() {
    this.setState({ scrollTop: this._masonry.scrollTop });
  }

  _onResize() {
    if (this._resizeMap.size === 0)
      this._resizeMap.set('resize', {
        itemId: this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).itemId,
        disparity: this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).disparity
      });
console.log('aa'
)
    // console.log('id: ' + (this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).itemId));
    // console.log('pos: ' + this._positionMaps.get(this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).itemId));
    // console.log('dis: ' + this._currentItemInViewport.get(CURRENT_ITEM_IN_VIEWPORT).disparity);
    // this._scrollToItem(this._resizeMap.get('resize').itemId, this._resizeMap.get('resize').disparity);
    // console.log('s2: ' + scrollTop);
  }

  _scrollToOffset(top) {
    this._masonry.scrollTo(0, top);
  }

  /*
   *  Get total height in estimation.
   */
  _getEstimatedTotalHeight(): number {
    const { data, cellMeasurerCache: { defaultHeight } } = this.props;

    if (!this._itemsMap || this._itemsMap.size === 0) {
      return data.length * defaultHeight;
    }

    let totalHeight = 0;

    // TODO: Improve algorithm
    // this loop is run in each render
    data.forEach((item) => {
      if (this._itemsMap.has(item.itemId)) {
        totalHeight += this._itemsMap.get(item.itemId).height;
      } else {
        totalHeight += defaultHeight;
      }
    });
    return totalHeight;
  }

  _updateItemOnMap(itemId: string, itemIndex: number, itemHeight: number, itemPosition: number) {
    this._itemsMap.set(itemId, { index: itemIndex, height: itemHeight, position: itemPosition });
  }

  onRemoveItem(itemId: string) {
    const { data } = this.props;
    const itemIndex = this._getIndexFromId(itemId);

    // remove an item means this item has new height equals 0
    this._updateItemsPositionWhenItemChangedHeight(itemId, 0);

    // Remove item on data list, rendered maps and position maps
    data.splice(itemIndex, 1);

    // Update index to id map after remove an item.
    this._updateMapIndex(itemIndex - 1, data.length);
    this._mapIndexToId.delete(data.length);

    // Update the map
    this._updateItemIndex(itemIndex);
    this._itemsMap.delete(itemId);

    this.forceUpdate();
  }

  _updateMapIndex(startIndex: number, endIndex: number) {
    const { data } = this.props;
    if (endIndex >= data.length) endIndex = data.length - 1;
    if (startIndex < 0) startIndex = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      this._mapIndexToId.set(i, data[i].itemId);
    }
  }

  _updateItemIndex(startIndex: number) {
    const { data } = this.props;
    let itemId;
    for (let i = startIndex; i <= data.length - 1; i++) {
      itemId = this._getItemIdFromIndex(i);
      this._updateItemOnMap(itemId, i, this._itemsMap.get(itemId).height, this._itemsMap.get(itemId).position);
    }
  }

  /*
   *  Update all items' position
   */
  _updateItemsPosition() {
    const { data } = this.props;
    let currentPosition = 0;
    data.forEach((item) => {
      this._updateItemOnMap(item.itemId,
        data.indexOf(item),
        this._itemsMap.get(item.itemId).height,
        currentPosition);
      currentPosition += this._itemsMap.get(item.itemId).height;
    });
  }

  /*
   *  Update other items' position below the item that changed height.
   */
  _updateItemsPositionWhenItemChangedHeight(itemId: string, newHeight: number) {
    this._updateItemOnMap(itemId,
      this._itemsMap.get(itemId).index,
      newHeight,
      this._itemsMap.get(itemId).position);
    this._updateItemsPositionFromSpecifiedItem(itemId);
  }

  /*
   *  Calculate items' position from specified item to end the data list => reduces number of calculation
   */
  _updateItemsPositionFromSpecifiedItem(itemId: string) {
    const { data } = this.props;
    // console.log('-----------------------');
    let currentItemId = itemId;
    const currentIndex = this._getIndexFromId(itemId);

    // TODO: High cost
    for (let i = currentIndex; i < data.length; i++) {
      const currentItemPosition = this._itemsMap.get(currentItemId).position;
      let currentItemHeight = this._itemsMap.get(currentItemId).height;
      const followingItemId = this._getItemIdFromIndex(i + 1);
      if (followingItemId !== OUT_OF_RANGE) {
        this._updateItemOnMap(followingItemId,
          this._itemsMap.get(followingItemId).index,
          this._itemsMap.get(followingItemId).height,
          currentItemPosition + currentItemHeight);
        currentItemId = followingItemId;
      }
    }
  }

  /*
   *  Get item's position by itemId.
   *  @param:
   *        + itemId (string): identification of item.
   *  @return:
   *        + (number): top coordinate of item.
   *        + NOT_FOUND (-1): if item is NOT in _positionMaps.
   */
  _getPosition(itemId: string): number {
    return this._itemsMap.has(itemId) ? this._itemsMap.get(itemId).position : NOT_FOUND
  }

  /*
 *  Get itemId of a item in _positionMaps by position.
 *  @param:
 *        + positionTop (number): position top where wanna get item in this.
 *  @return:
 *        + key (string): itemId.
 *        + OUT_OF_RANGE ('out of range'): if position param is greater than total height.
 */
  _getItemIdFromPosition(positionTop: number): string {
    if (positionTop >= this._getEstimatedTotalHeight()) return this._getItemIdFromIndex(this.props.data.length - 1);

    for (let key of this._itemsMap.keys()) {
      if (positionTop >= this._getPosition(key) &&
        positionTop < this._getPosition(key) + this._itemsMap.get(key).height) {
        return key;
      }
    }
  }

  /*
 *  Get index of a item in data array by id
 *  @param:
 *        + itemId (string): identification of item. This id is unique for each item in array.
 *  @return:
 *        + (number): a value represents index of that item in the array. In case the result has more than one, return the first item.
 *        + NOT_FOUND (-1): if item isn't in the array.
 */
  _getIndexFromId(itemId: string): number {
    return this._itemsMap.has(itemId) ? this._itemsMap.get(itemId).index : NOT_FOUND;
  }

  /*
   *  Get itemId from index.
   *  @param:
   *        + index (number): index of item.
   *  @return:
   *        + a string represents for itemId
   *        + OUT_OF_RANGE (-3): if index out of range of data.
   */
  _getItemIdFromIndex(index: number): string {
    if (index >= this.props.data.length || index < 0) return OUT_OF_RANGE;
    return this._mapIndexToId.get(index);
  }

  /*
   *  Return an array that stores itemId of items rendering in batch
   *  @param:
   *      scrollTop: offset top of Masonry
   *  @return: an Array<string>
   */
  _getItemsInBatch(scrollTop: number): Array<string> {
    const { height, preRenderCellCount, data } = this.props;

    let results: Array<string> = [];
    const currentIndex = this._getIndexFromId(this._getItemIdFromPosition(scrollTop));
    const numOfItemInViewport = this._getItemsInViewport(scrollTop, height).length;
    const startIndex = Math.max(0, currentIndex - preRenderCellCount);
    const endIndex = Math.min(currentIndex + numOfItemInViewport + preRenderCellCount, data.length);

    for (let i = startIndex; i < endIndex; i++) {
      results.push(data[i].itemId);
    }

    return results;
  }

  /*
   *  Return an array stores all items rendering in viewport.
   *  @params:
   *        + scrollTop (number): this masonry position.
   *        + height (number): viewport's height;
   *  @return:
   *        + empty: if scrollTop is out of range or there isn't any items in viewport.
   *        + (Array<string>): stores all items' id in viewport.
   */
  _getItemsInViewport(scrollTop: number, viewportHeight: number): Array<string> {
    const itemIdStart = this._getItemIdFromPosition(scrollTop);
    const results = new Array(0);

    if (itemIdStart !== NOT_FOUND) {
      results.push(itemIdStart);

      // disparity > 0 when scrollTop position is between `the item's position` and `item's position + its height`.
      const disparity = scrollTop - this._itemsMap.get(itemIdStart).position;
      let remainingView = viewportHeight - this._itemsMap.get(itemIdStart).height + disparity;

      let i = 1;
      let itemIndex = this._getIndexFromId(itemIdStart);
      if (itemIndex + i >= this.props.data.length) {
        itemIndex = this.props.data.length - 2;
      }

      let nextItemId = this._getItemIdFromIndex(itemIndex + i);
      let nextItemHeight = this._itemsMap.get(nextItemId).height;

      while (remainingView > nextItemHeight) {
        remainingView -= nextItemHeight;
        results.push(nextItemId);
        i++;
        nextItemId = this._getItemIdFromIndex(itemIndex + i);
        if (nextItemId !== OUT_OF_RANGE)
          nextItemHeight = this._itemsMap.get(nextItemId).height;
      }
      if (remainingView > 0) {
        results.push(nextItemId);
      }
    }

    return results;
  }

  _scrollToItem(itemId: string, disparity) {
    if (this._itemsMap.has(itemId)) {
      this._scrollToOffset(this._itemsMap.get(itemId).position + disparity);
    }
  }
}

export default Masonry;