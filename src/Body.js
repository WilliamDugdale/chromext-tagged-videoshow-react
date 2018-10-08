/*global chrome*/
import React, { Component } from 'react';
import Navigator from './Navigator.js';
import ActionArea from './ActionArea.js';

export default class Body extends Component {
    constructor(props) {
        super(props);
        this.state = {isTagMode: false, tags: null};
      }

    changeMode = () => {
        this.setState(state => ({
            isTagMode: !state.isTagMode
        }));
    }

    setTags = (tags) => {
        this.setState(() => ({
            tags: tags
        }));
    }

    currentTags = () => {
        chrome.bookmarks.search('video_tags', function (tagsNode) {
              chrome.bookmarks.getSubTree(tagsNode[0].id, 
                function(bookmarkTreeNodes) {
                  let tags = bookmarkTreeNodes[0].children.filter(item => !item.url);
                  this.setTags(tags);
                });
        });
    }

    componentDidMount() {
        this.currentTags();
    }

    render () {
        console.log(this.state.tags);
        return (
            <div >
            <Navigator isTagMode={this.state.isTagMode} changeMode={this.changeMode} />
            <ActionArea isTagMode={this.state.isTagMode} />
            </div>
        );
    }
}