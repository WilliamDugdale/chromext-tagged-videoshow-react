import React, { Component } from 'react';
import Multibox from './Multibox';
import Buttons from './Buttons';
import CheckBoxes from './CheckBoxes';

export default class ActionArea extends Component {
    render () {
        return (
            <div>
                <Buttons />
                <CheckBoxes />
            </div>
        );
    }
}