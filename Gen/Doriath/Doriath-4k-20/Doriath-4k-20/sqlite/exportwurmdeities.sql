/* Controllable exports for easy diffing */
/* Set output file and export schema */
.out wurmdeities.export.sql
.schema DEITIES 
.schema HELPERS
.schema VISITED 
.schema ENTITIES
.schema CONTROLLERS 
.schema DEITYEFFECTS 
.schema KINGDOMEFFECTS 
.schema EPICMISSIONS
.schema SCENARIOS
.schema ENTITYFIGHTACTIONS
.schema ENTITYFIGHTS
.schema ENTITYSKILLS
.schema RITUALCASTS
.schema RITUALCLAIMS
.out insertwurmdeities.export.sql
.mode insert DEITIES 
select * from DEITIES;
.mode insert HELPERS
select * from HELPERS;
.mode insert VISITED 
select * from VISITED;
.mode insert ENTITIES
select * from ENTITIES;
.mode insert CONTROLLERS 
select * from CONTROLLERS;
.mode insert DEITYEFFECTS 
select * from DEITYEFFECTS;
.mode insert KINGDOMEFFECTS 
select * from KINGDOMEFFECTS;
.mode insert EPICMISSIONS
select * from EPICMISSIONS;
.mode insert SCENARIOS
select * from SCENARIOS;
.mode insert ENTITYFIGHTACTIONS
select * from ENTITYFIGHTACTIONS;
.mode insert ENTITYFIGHTS
select * from ENTITYFIGHTS;
.mode insert ENTITYSKILLS
select * from ENTITYSKILLS;
.mode insert RITUALCASTS
select * from RITUALCASTS;
.mode insert RITUALCLAIMS
select * from RITUALCLAIMS;
