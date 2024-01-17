import { LightningElement, api } from 'lwc';

export default class PowerDataTable extends LightningElement {
    _fieldSetName;
    @api get fieldsetName() {
        return this._fieldSetName;
    }

    set fieldsetName(value) {
        if (value !== this._fieldSetName) {
            this._fieldSetName = value;
            this.fetchRecordsOfFieldSet();
        }
    }

    loading = false;
    fetchRecordsOfFieldSet() {
        this.loading = true;
    }
}