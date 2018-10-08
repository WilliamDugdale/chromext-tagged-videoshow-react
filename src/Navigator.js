import React, { Component } from 'react';

export default class Navigator extends Component {

    render () {
        return (
            <div>
                <button id="tagNewPageButton"
                    onClick={this.props.changeMode}
                    >
                    {this.props.isTagMode ? 'Browse' : 'Tag'}
                </button>
            </div>
        )
    }
}