## Changeslog

#### Version 1.0.2's changes:

`Date:` 2024-04-17  
`Author:` @ehategekimana  
`Changes:`

- added changelog file
- capture `syncTime` in the database, the time sns was last synced
- Handle create default sync data when no data is available yet

#### Version 1.0.21's changes:

`Date:` 2024-04-24
`Author:` @ehategekimana
`Changes:`

- consider findOne by date,while updating tally, rather than by recent record

#### Version 1.0.22's changes:

`Date:` 2024-04-26
`Author:` @ehategekimana
`Changes:`

- Fix sync tally from sns

#### Version 1.0.23's changes:

`Date:` 2024-05-06
`Author:` @
`Changes:`

- Remove local date dependency on data sync
- Make table_name and date a unique compound index

#### Version 1.0.26's changes:

`Date:` 2024-05-07
`Author:` @
`Changes:`

- Fix sync tally from sns

#### Version 1.0.30's changes:

`Date:` 2024-05-23
`Author:` @
`Changes:`

- Fix stock level both sync and notify
- fix: update or create tally by today utc date instead of checking max exists
- Format date as ISO string instead of UTC string
- fix : record stock level tally
- fix : update deliveries statuses

#### Version 1.0.8's changes

`Date:` 2025-03-30
`Author:` @
`Changes:`

- Fix stock tally report
- Implement service health check API

