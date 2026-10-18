# Villa Somalia SCADA – demo script for the initial presentation

About 10 minutes, during slide 9 of the deck. The HMI runs on a plant simulator; say that the values are simulated.

## Before the meeting

1. Open `hmi/index.html` in Chrome (no install, no server).
2. SYSTEM → User management: log in as **Admin**.
3. SYSTEM → Simulation: speed **×60**, then CLEAR (clear all simulated faults).
4. Do **not** open SYSTEM → Communication status: it still shows the Schneider controller (Rev 2), not the SICAM A8000 pair.
5. Rehearse step 3 once to see how long the battery takes to reach 20 %.

## Running order

| # | Scenario | Time | Do | Say |
|---|---|---|---|---|
| 1 | Normal day | 1 min | OVERVIEW | PV feeds the plant, the battery charges and forms the grid, generators off, both offices supplied. |
| 2 | Switching a breaker | 2 min | Click AH7 (spare feeder), open the faceplate, select then confirm | Interlocks are checked live; a command needs select then confirm within 30 s. Log in as Operator: settings are greyed out. |
| 3 | Low battery | 2 min | Simulation → Heavy cloud on, speed ×300; then GENERATION → Generators; speed back to ×60 | At 20 % charge the EMS starts a generator; it stops at 80 %. If it takes too long, describe it and move on. |
| 4 | The EMS stops | 2 min | Simulation → EMS stops; ALARMS; then EMS restarts | Level 1 alarm; the generators carry the plant on their own. The SCADA does not take over the EMS's job. |
| 5 | Fire in the battery | 3 min | CLEAR, then Fire pre-alarm, then Fire confirmed; OVERVIEW; ALARMS → Acknowledge all | The fire panel trips the battery by its own circuit, the generators restore the busbar, the offices come back. Fire alarms reset only at the fire panel. |

Optional if there is time: Simulation → Controller A fails, to show the hot standby take over.

If the demo fails, go to slide 10: it shows the fire scenario as screenshots.
