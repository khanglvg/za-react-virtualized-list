// @flow

import React from 'react';
import { MessageProps } from './type';
import './css/TheirMessage.css'
import './css/MyMessage.css'
import type { ModelBase } from "../ModelBase/ModelBase";
import ViewModelBase from "../ViewModel/ViewModelBase";

export default class Message extends React.PureComponent<MessageProps> implements ModelBase {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
    };

    this.viewModel = new ViewModelBase();

    this._onClick = this._onClick.bind(this);
    this._onRemove = this._onRemove.bind(this);
  }

  componentDidMount() {
  }

  render() {
    const { id, index, userAvatarUrl, userName, messageContent, sentTime, isMine } = this.props;
    const { isExpanded } = this.state;

    return (
      isMine ?
        <div id={id} className="row">
          <div className={isExpanded ? "expand-height": "none"}/>
          <div className={"my-message-container"}>

            <div className={"my-button-container"}>
              <button className={"red"} onClick={this._onClick}>
                {isExpanded ?
                  "Minimize" :
                  "Expand"
                }
              </button>
            </div>

            {/* MESSAGE CONTENT VIEW */}
            <div className="my-message-content-container">
              <div className="my-message-content-user-name">
                <p>{userName}</p>
                <p> Index in data: {index} </p>
              </div>

              <div className="my-message-content-content">
                <p>{messageContent}</p>
              </div>

              <div className="my-message-content-sent-time">
                <p>{this._getDisplayTime(new Date(sentTime))}</p>
              </div>
            </div>

            {/* AVATAR VIEW */}
            <div className="my-message-avatar-container">
              <div className="my-message-avatar-border">
                <img className="my-message-avatar"
                     src={userAvatarUrl}
                     alt="Avatar"/>
              </div>
            </div>
          </div>
        </div>

        :

        <div id={id} className={"their-message-container"}>
          <div className={isExpanded ? "expand-height": "none"}/>

          {/* AVATAR VIEW */}
          <div className="their-message-avatar-container">
            <div className="their-message-avatar-border">
              <img className="their-message-avatar"
                   src={userAvatarUrl}
                   alt="Avatar"/>
            </div>
          </div>

          {/* MESSAGE CONTENT VIEW */}
          <div className="their-message-content-container">
            <div className="their-message-content-user-name">
              <p>{userName}</p>
              <p> Index in data: {index} </p>
            </div>

            <div className="their-message-content-content">
              <p>{messageContent}</p>
            </div>

            <div className="their-message-content-sent-time">
              <p>{this._getDisplayTime(new Date(sentTime))}</p>
            </div>
          </div>

          <div className={"their-button-container"}>
            <button className={"red"} onClick={this._onClick}>
              {isExpanded ?
                "Minimize" :
                "Expand"
              }
            </button>

            <button style={{ marginLeft: "10px" }} onClick={this._onRemove}>
              Remove
            </button>
          </div>
        </div>
    );
  }

  get getItemId(): string {
    return this.props.id;
  }

  get getUserAvatarUrl(): string {
    return this.props.userAvatarUrl;
  }

  get getUserName(): string {
    return this.props.userName;
  }

  get getMessageContent(): string {
    return this.props.messageContent;
  }

  get getSentTime(): string {
    return this.props.sentTime;
  }

  get getIsMine(): boolean {
    return this.props.isMine;
  }

  _getDisplayTime = (time): string => {
    let minutes = time.getMinutes();
    if (time.getMinutes() < 10) {
      minutes = '0' + time.getMinutes();
    }
    let hours = time.getHours();
    if (time.getHours() < 10) {
      hours = '0' + time.getHours();
    }
    return hours + ':' + minutes;
  };

  _onClick() {
    const { isExpanded } = this.state;
    isExpanded ?
      this.setState({ isExpanded: false }) :
      this.setState({ isExpanded: true })
  }

  _onRemove() {
    this.viewModel.onRemove(this.props.id, this.props.onRemoveItem);
  }
}