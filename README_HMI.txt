VILLA SOMALIA HYBRID POWER PLANT - SCADA HMI MOCK-UP
How to access the HMI screens
====================================================

1. EXTRACT THE SUBMISSION
   - Right-click the compressed (.zip) submission and choose "Extract All..."
     (or use 7-Zip / WinRAR).
   - Extract the WHOLE archive. The HMI will not run from inside the zip,
     and the "hmi" folder must keep its "css" and "js" sub-folders.

2. OPEN THE HMI
   - Go to the extracted folder and open:   hmi\index.html
   - Double-click it, or right-click > Open with > Google Chrome / Microsoft
     Edge / Mozilla Firefox.
   - No installation, no server and no internet connection are needed.

3. NAVIGATE THE SCREENS
   - Top menu bar = main areas:
       OVERVIEW | MV SWITCHGEAR | GENERATOR | BATTERY | PV SYSTEM | LOAD |
       FIRE & SAFETY | PPC | ALARMS | TRENDS | I/O LIST | SYSTEM
   - The bar under the menu shows the screens within each area.
   - The red/amber banner shows active alarms. Click it to open the alarm
     list, or press ACK ALL to acknowledge them.
   - Click any breaker or piece of equipment to open its faceplate
     (status, measurements, interlocks, commands).

4. USER LEVELS (no passwords in the mock-up)
   - The HMI starts at OPERATOR level.
   - To change level, click "User level" in the bottom-right corner (or
     go to SYSTEM > Users & Simulation) and select:
       VIEWER    - view screens, trends and reports only
       OPERATOR  - acknowledge alarms, operate breakers / DG / BESS / inverters
       ENGINEER  - change setpoints and modes, black-start, fault injection
       ADMIN     - full access

5. SIMULATION
   - The plant values come from a built-in simulator. It starts from local
     midnight (Mogadishu time), so trends, energy and battery SOC already
     look realistic when the page opens.
   - At ENGINEER level, SYSTEM > Users & Simulation lets you change the
     simulation speed (x1 to x300) and inject faults (feeder trip, BESS
     fault/fire, DG fail-to-start, inverter fault, cloud, fibre loss, ...).
     Use "Clear all injected faults" to return to normal.
   - Press F5 (refresh) at any time to restart the simulation.

6. OTHER SUBMITTALS IN THE PACKAGE
   - docs\SCADA_Design_Basis.md  - design basis, communication architecture,
                                   cybersecurity and operating sequences
   - docs\IO_List.csv            - full I/O list (opens in Excel)
   - The live I/O list can also be viewed and exported as CSV from the
     I/O LIST screen in the HMI.

TROUBLESHOOTING
   - Blank or unstyled page: the archive was not fully extracted, or
     index.html was moved out of the "hmi" folder. Re-extract and open
     hmi\index.html in place.
   - Use an up-to-date Chrome, Edge or Firefox. Internet Explorer is not
     supported.
