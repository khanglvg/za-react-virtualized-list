// @flow

import React from 'react';
import type { CellRenderer } from "../utils/types";
import CellMeasurerCache from "../CellMeasurer/CellMeasurerCache";
import Message from "../Message/Message";
import CellMeasurer from "../CellMeasurer/CellMeasurer";
import * as ReactDOM from "react-dom";

type Props = {
  className?: string,
  id?: ?string,
  style?: mixed,
  height: number,
  preRenderCellCount: number,
  cellRenderer: CellRenderer,
  cellCount: number,
  cellMeasurerCache: CellMeasurerCache
};

class Masonry extends React.PureComponent<Props> {
  constructor(props) {
    super(props);

    this.state = {
      isScrolling: false
    };

    this._calculateBatchSize = this._calculateBatchSize.bind(this);
    this._onScroll = this._onScroll.bind(this);
  }

  componentDidMount() {
    ReactDOM.findDOMNode(this).addEventListener('scroll', this._onScroll);
  }

  render() {
    const {
      className,
      id,
      height,
      style,
      isScrolling,
      cellRenderer,
      preRenderCellCount,
      cellCount,
      cellMeasurerCache
    } = this.props;
    const estimateTotalHeight = this._getEstimatedTotalHeight(cellCount, 100);

    const children = [];

    const numOfCellOnBatch =
      this._calculateBatchSize(preRenderCellCount, cellMeasurerCache.defaultHeight, height)
      / cellMeasurerCache.defaultHeight;

    // for (let i = 0; i <= numOfCellOnBatch - 1; i++)
    //   children.push( () => {
    //     cellRenderer({
    //       id,
    //       isScrolling,
    //       style: {
    //         height: 120,
    //         position: 'absolute',
    //         width: '100%',
    //       },
    //     })}
    //   );

    for (let i = 0; i <= numOfCellOnBatch - 1; i++) {
      // TODO: store all cells to a map.
      const top = 120 * i; // find in maps the cell before in batch size
      const left = 0;
      children.push(
        <CellMeasurer cache={new CellMeasurerCache({ defaultHeight: 100 })} id={i} position={{ top: top, left: left }}>
          <Message id={i}
                   userAvatarUrl={'https://randomuser.me/api/portraits/thumb/women/60.jpg'}
                   userName={'vanessa'}
                   messageContent={'Bacon ipsum dolor amet short loin sirloin meatloaf fatback, chuck turducken filet mignon kevin pork chop.'}
                   sentTime={'2007-04-07T04:21:47Z'}
                   isMine={true}/>
        </CellMeasurer>
      )
    }

    return (
      <div className={className}
           id={id}
           onScroll={this._onScroll}
           style={{
             boxSizing: 'border-box',
             overflowX: 'hidden',
             overflowY: estimateTotalHeight < height ? 'hidden' : 'auto',
             width: 'auto',
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

  _onScroll() {
    console.log(document.getElementById(this.props.id).scrollTop);
  }

  _onResize() {

  }

  _onUpdate() {
    
  }

  _getEstimatedTotalHeight(cellCount: number, defaultCellHeight: number): number {
    return cellCount * defaultCellHeight;
  }

  _calculateBatchSize(preRenderCellCount: number, cellHeight: number, masonryHeight: number): number {
    const overScanByPixel = preRenderCellCount * cellHeight;
    return 2 * overScanByPixel + masonryHeight;
  }

  // _pushChildrenContent(children: [], cellRenderer, cellCount) {
  //   for (let i = 0; i <= cellCount - 1; i++)
  //     children.push(
  //       cellRenderer({
  //         index,
  //         isScrolling,
  //         style: {},
  //       }),
  //     );
  // }
}

export default Masonry;