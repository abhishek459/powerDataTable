public with sharing class PowerDataTableController {
    static final String PICKLIST_TYPE = 'PICKLIST';
    static final String DEFAULT_SORTED_FIELD = 'CreatedDate';
    static final String EMPTY_STRING = '';

    public class FieldMetadataWrapper {
        @AuraEnabled public String path { get; set; } // Field API name of this field
        @AuraEnabled public String label { get; set; } // Label of this field
        @AuraEnabled public String type { get; set; } // Data type of this field value
        @AuraEnabled public Object value { get; set; } // Value attribute stored for this field in record
        @AuraEnabled public Boolean required { get; set; } // Whether this field is required or not when saving
        @AuraEnabled public Boolean isPicklist { get; set; } // Whether this field is a picklist type
        @AuraEnabled public Boolean isSortedBy { get; set; } // Whether is field is used for sorting
        @AuraEnabled public Boolean ascending { get; set; } // Sorting order is ascending or descending
        @AuraEnabled public String formattedValue { get; set; } // Formatted value in current locale

        public FieldMetadataWrapper(String path, String label, String type, Boolean required) {
            this.path = path;
            this.label = label;
            this.type = type;
            this.required = required;
        }

        public FieldMetadataWrapper() {}
    }

    public class DataWrapper {
        @AuraEnabled public String recordId { get; set; }
        @AuraEnabled public List<FieldMetadataWrapper> fieldValues { get; set; }
        @AuraEnabled public Integer srNo { get; set; }
        
        public DataWrapper(String recordId, List<FieldMetadataWrapper> fieldValues, Integer srNo) {
            this.recordId = recordId;
            this.fieldValues = fieldValues;
            this.srNo = srNo;
        }
    }

    public class RecordWrapper {
        @AuraEnabled public List<FieldMetadataWrapper> sObjectFieldMetadataList { get; set; }
        @AuraEnabled public List<DataWrapper> records { get; set; }
        @AuraEnabled public Map<String, List<Map<String, String>>> picklistOptions { get; set; }
        @AuraEnabled public String queryString { get; set; }
        @AuraEnabled public String sortedBy { get; set; }
    }

    @AuraEnabled
    public static RecordWrapper fetchRecordsByFieldSet(String objectName, String fieldSetName) {
        try {
            Schema.FieldSet fieldSet = Schema.getGlobalDescribe().get(objectName).getDescribe().fieldSets.getMap().get(fieldSetName);
            if (fieldSet == NULL) {
                throw new AuraHandledException('Please provide a valid field set name');
            }
            List<Schema.FieldSetMember> fields = fieldSet.getFields();

            String queryString = createQueryString(fields, objectName);

            List<sObject> records = Database.Query(queryString);

            RecordWrapper myRecordWrapper = new RecordWrapper();
            myRecordWrapper.sObjectFieldMetadataList = createSObjectMetadataList(fields);
            myRecordWrapper.records = getRecordsWithFieldWrapper(records, myRecordWrapper.sObjectFieldMetadataList);
            myRecordWrapper.picklistOptions = createPicklistOptions(myRecordWrapper.sObjectFieldMetadataList, objectName);
            myRecordWrapper.queryString = queryString;
            myRecordWrapper.sortedBy = DEFAULT_SORTED_FIELD;
            return myRecordWrapper;
        } catch (Exception e) {
            throw e;
        }
    }

    public static String createQueryString(List<Schema.FieldSetMember> fields, String objectName) {
        String queryString = 'SELECT Id';
        for (Schema.FieldSetMember fieldSetMember : fields) {
            queryString += ', ' + fieldSetMember.getFieldPath();
        }
        queryString += ' FROM ' + objectName + ' ORDER BY ' + DEFAULT_SORTED_FIELD + ' DESC LIMIT 25';
        return queryString;
    }

    public static List<FieldMetadataWrapper> createSObjectMetadataList(List<Schema.FieldSetMember> fields) {
        List<FieldMetadataWrapper> sObjectFieldMetadataList = new List<FieldMetadataWrapper>();
        for (Schema.FieldSetMember fieldSetMember : fields) {
            FieldMetadataWrapper header = new FieldMetadataWrapper(
                fieldSetMember.getFieldPath(),
                fieldSetMember.getLabel(),
                String.valueOf(fieldSetMember.getType()),
                fieldSetMember.getDBRequired()
            );
            header = getDefaultSortedValue(header);
            sObjectFieldMetadataList.add(header);
        }
        return sObjectFieldMetadataList;
    }

    public static FieldMetadataWrapper getDefaultSortedValue(FieldMetadataWrapper header) {
        if (header.path == DEFAULT_SORTED_FIELD) {
            header.ascending = false;
            header.isSortedBy = true;
        } else {
            header.isSortedBy = false;
        }
        return header;
    }

    public static List<DataWrapper> getRecordsWithFieldWrapper(List<sObject> records, List<FieldMetadataWrapper> sObjectFieldMetadataList) {
        List<DataWrapper> recordsWrapper = new List<DataWrapper>();
        Integer counter = 1;
        for (sObject record : records) {
            List<FieldMetadataWrapper> fieldWrappers = new List<FieldMetadataWrapper>();
            Map<String, Object> fieldValues = record.getPopulatedFieldsAsMap();
            for (FieldMetadataWrapper header : sObjectFieldMetadataList) {
                FieldMetadataWrapper fieldData = new FieldMetadataWrapper(header.path, header.label, header.type, header.required);
                fieldData.value = sanitizeValue(fieldValues.get(header.path));
                fieldData.isPicklist = fieldData.type == PICKLIST_TYPE ? true : false;
                fieldData.formattedValue = getFormattedValue(fieldData);
                fieldWrappers.add(fieldData);
            }
            DataWrapper recordData = new DataWrapper(String.valueOf(record.get('Id')), fieldWrappers, counter);
            recordsWrapper.add(recordData);
            counter += 1;
        }
        return recordsWrapper;
    }

    public static Object sanitizeValue(Object obj) {
        return obj == NULL ? EMPTY_STRING : obj;
    }

    public static String getFormattedValue(FieldMetadataWrapper fieldData) {
        if (fieldData.value == EMPTY_STRING) return EMPTY_STRING;
        switch on fieldData.type {
            when 'CURRENCY', 'DECIMAL', 'INTEGER' {
                return Decimal.valueOf(String.valueOf(fieldData.value)).format();
            }
            when 'DATETIME' {
                String timeZone = UserInfo.getTimeZone().getDisplayName();
                return DateTime.valueOf(String.valueOf(fieldData.value)).format('dd-MMM-yy, hh:mm a', timeZone);
            }
            when else {
                return String.valueOf(fieldData.value);
            }
        }
    }

    public static Map<String, List<Map<String, String>>> createPicklistOptions(List<FieldMetadataWrapper> sObjectFieldMetadataList, String objectName) {
        Map<String, List<Map<String, String>>> picklistOptions = new Map<String, List<Map<String, String>>>();
        for (FieldMetadataWrapper fieldMetada : sObjectFieldMetadataList) {
            if (fieldMetada.type == PICKLIST_TYPE) {
                picklistOptions.put(fieldMetada.path, new List<Map<String, String>>());
                List<Schema.PicklistEntry> picklistValues = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldMetada.path).getDescribe().getPicklistValues();
                picklistOptions.get(fieldMetada.path).add(new Map<String, String>{'label'=>'--None--', 'value'=>EMPTY_STRING});
                for(Schema.PicklistEntry pickListVal : picklistValues) {
                    picklistOptions.get(fieldMetada.path).add(new Map<String, String>{'label'=>pickListVal.getLabel(), 'value'=>pickListVal.getValue()});
                }
            }
        }
        return picklistOptions;
    }

    @AuraEnabled
    public static RecordWrapper getRecordsFromQuery(String queryString, List<FieldMetadataWrapper> sObjectFieldMetadataList){
        try {
            List<sObject> records = Database.query(queryString);
            RecordWrapper myRecordWrapper = new RecordWrapper();
            myRecordWrapper.records = getRecordsWithFieldWrapper(records, sObjectFieldMetadataList);
            return myRecordWrapper;
        } catch (Exception e) {
            throw e;
        }
    }
}