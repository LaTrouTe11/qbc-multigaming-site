CREATE TABLE DEITIES 
( 
    ID                      TINYINT       NOT NULL PRIMARY KEY,
    NAME                    VARCHAR(40)   NOT NULL,
    FAITH                   DOUBLE        NOT NULL,
    FAVOR                   INT           NOT NULL DEFAULT 0,
    ALIGNMENT               TINYINT       NOT NULL,
    SEX                     TINYINT       NOT NULL,
    HOLYITEM                INT           NOT NULL,
    POWER                   TINYINT       NOT NULL,
    ATTACK                  FLOAT         NOT NULL DEFAULT 1,
    VITALITY                FLOAT         NOT NULL DEFAULT 1
);
CREATE TABLE HELPERS
( 
    WURMID                  BIGINT        NOT NULL PRIMARY KEY,
    KARMA                   INTEGER       NOT NULL DEFAULT 0,
    DEITY                   INT           NOT NULL DEFAULT 0
);
CREATE TABLE VISITED 
( 
    HEXID                   INT           NOT NULL DEFAULT 0,
    ENTITYID                BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (HEXID, ENTITYID)
);
CREATE TABLE ENTITIES
(
    ID                      BIGINT        NOT NULL PRIMARY KEY,
    NAME                    VARCHAR(40)   NOT NULL,
    COMPANION               BIGINT        NOT NULL DEFAULT 0,
    DEMIGODPLUS             TINYINT       NOT NULL DEFAULT 0,
    SPAWNPOINT              INT           NOT NULL DEFAULT 0,
    ENTITYTYPE              INT           NOT NULL DEFAULT 0,
    ATTACK                  FLOAT         NOT NULL DEFAULT 1,
    VITALITY                FLOAT         NOT NULL DEFAULT 1,
    INATTACK                FLOAT         NOT NULL DEFAULT 1,
    INVITALITY              FLOAT         NOT NULL DEFAULT 1,
    CARRIER                 BIGINT        NOT NULL DEFAULT 0,
    HELPED                  TINYINT(1)    NOT NULL DEFAULT 0,
    ENTERED                 BIGINT        NOT NULL DEFAULT 0,
    CURRENTHEX              BIGINT        NOT NULL DEFAULT 0,
    LEAVING                 BIGINT        NOT NULL DEFAULT 0,
    TARGETHEX               INT           NOT NULL DEFAULT -1
);
CREATE TABLE CONTROLLERS 
( 
    CONTROLLER              BIGINT        NOT NULL DEFAULT 0,
    CREATURE                INT           NOT NULL DEFAULT 0
);
CREATE TABLE DEITYEFFECTS 
( 
    EFFECT                  INT           NOT NULL DEFAULT 0 PRIMARY KEY,
    DEITY                   BIGINT        NOT NULL DEFAULT 0
);
CREATE TABLE KINGDOMEFFECTS 
( 
    EFFECT                  INT           NOT NULL DEFAULT 0 PRIMARY KEY,
    KINGDOM                 TINYINT       NOT NULL DEFAULT 0
);
CREATE TABLE EPICMISSIONS
(
    ID                      INTEGER       NOT NULL PRIMARY KEY,
    NAME                    VARCHAR(100)  NOT NULL DEFAULT "",
    SCENARIONAME            VARCHAR(100)  NOT NULL DEFAULT "",
    MISSION                 INT           NOT NULL DEFAULT 0,
    SCENARIO                INT           NOT NULL DEFAULT 0,
    TSTAMP                  BIGINT        NOT NULL DEFAULT 0,
    ENDTIME                 BIGINT        NOT NULL DEFAULT 0,
    ENTITY                  INT           NOT NULL DEFAULT 0,
    SERVERID                INT           NOT NULL DEFAULT 0,
    PROGRESS                FLOAT         NOT NULL DEFAULT 0,
    CURRENT                 TINYINT(1)    NOT NULL DEFAULT 0
);
CREATE TABLE SCENARIOS
(
    ID                      INTEGER       NOT NULL PRIMARY KEY,
    NAME                    VARCHAR(50)   NOT NULL DEFAULT "",
    NUMBER                  INT           NOT NULL DEFAULT 0,
    REASONEFF               INT           NOT NULL DEFAULT 0,
    COLLREQ                 INT           NOT NULL DEFAULT 0,
    COLLWURMREQ             INT           NOT NULL DEFAULT 0,
    SPAWNREQ                TINYINT(1)    NOT NULL DEFAULT 0,
    HEXREQ                  INT           NOT NULL DEFAULT 0,
    QUESTSTRING             TEXT          NOT NULL,
    CURRENT                 TINYINT(1)    NOT NULL DEFAULT 1
);
/* Used for tracking ritual casts */
CREATE TABLE RITUALCASTS
(
    ID                      INT           NOT NULL PRIMARY KEY, /* When a ritual is cast, this will be the ID of the cast to claim */
    CASTERID                BIGINT        NOT NULL, /* WurmID for the player that cast the ritual */
    SPELLID                 INT           NOT NULL, /* Spell ID for the ritual that was cast (which ritual is it?) */
    DEITYID                 INT           NOT NULL, /* Deity of the player which casted the spell (Vynora or Paaweelr?) */
    CASTTIME                BIGINT        NOT NULL, /* When the ritual was cast timestamp */
    DURATION                BIGINT        NOT NULL  /* How long the ritual will last */
);

/* Used to record which rites that a player has claimed */
CREATE TABLE RITUALCLAIMS
(
    ID                      INT           NOT NULL PRIMARY KEY, /* Database reference ID for the ritual claim */
    PLAYERID                BIGINT        NOT NULL, /* ID of the player that claimed the effect */
    RITUALCASTSID           INT           NOT NULL, /* Primary ritual ID reference to RITUALCASTS table */
    CLAIMTIME               BIGINT        NOT NULL /* Timestamp for when the player claimed the bonus */
);
