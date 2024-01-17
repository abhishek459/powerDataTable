public with sharing class PowerDataTableController {
    private class FieldsWrapper {
        @AuraEnabled public String path { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String type { get; set; }
        @AuraEnabled public Boolean required { get; set; }
    }

    @AuraEnabled
    public static string fetchRecords(String objectName, String fieldSetName) {
        try {
            Schema.FieldSet fieldSet = Schema.getGlobalDescribe().get(objectName).getDescribe().fieldSets.getMap().get(fieldSetName);
            if (fieldSet == NULL) {
                return 'Please provide a valid field set name';
            }
            List<Schema.FieldSetMember> fields = fieldSet.getFields();
            for (Schema.FieldSetMember fieldSetMember : fields) {
                System.debug('fieldSetMember.getDBRequired() - ' + fieldSetMember.getDBRequired());
                System.debug('fieldSetMember.getFieldPath() - ' + fieldSetMember.getFieldPath());
                System.debug('fieldSetMember.getLabel() - ' + fieldSetMember.getLabel());
                System.debug('fieldSetMember.getRequired() - ' + fieldSetMember.getRequired());
                System.debug('fieldSetMember.getType() - ' + String.valueOf(fieldSetMember.getType()));
                System.debug('fieldSetMember.getSObjectField() - ' + fieldSetMember.getSObjectField());
            }
            return NULL;
        } catch (Exception e) {
            throw e;
        }
    }
}