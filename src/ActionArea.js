import React, { Component } from 'react';
import Multibox from './Multibox';
import TagActionArea from './TagActionArea';
import BrowseActionArea from './BrowseActionArea';

export default class ActionArea extends Component {
    render () {
        return (
            <div>
            <Multibox />
            {this.props.isTagMode ? 
                <TagActionArea /> : 
                <BrowseActionArea />}
            </div>
        );
    }
}