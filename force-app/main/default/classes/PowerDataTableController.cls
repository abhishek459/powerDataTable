public with sharing class PowerDataTableController {
    @AuraEnabled
    public static string fetchRecords(String fieldSetName){
        try {
            Schema.FieldSet fieldSet = Schema.SObjectType.Account.fieldSets.getMap().get(fieldSetName);
            List<Schema.FieldSetMember> fields = fieldSet.getFields();
            return NULL;
        } catch (Exception e) {
            throw e;
        }
    }
}