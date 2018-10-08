import React, { Component } from 'react';
import Buttons from './Buttons';
import CheckBoxes from './CheckBoxes';

export default class BrowseActionArea extends Component {
    render () {
        return (
            <div>
                <Buttons />
                <CheckBoxes />
            </div>
        );
    }
}