import { useState, useEffect, useRef } from "react";
import "./index.css";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ScenarioId = "marta" | "luca" | "sofia";
type StepType = "opening" | "crisis" | "consequence" | "decision" | "forced" | "blackout" | "reframe" | "eu_solution" | "success";

type Option = { label: string; nextPath: string };
type Step = {
  id: string; type: StepType; title: string; body: string[];
  stats?: { demand: number; supply: number };
  gridState?: GridStateKey;
  options?: Option[]; buttonLabel?: string; nextStep?: string; blackoutLine?: string;
};

type Scenario = {
  id: ScenarioId; name: string; age: number; location: string; role: string; emoji: string;
  concern: string; profileText: string; crisisTitle: string;
  baseStats: { demand: number; supply: number };
  steps: Record<string, Step>; startStep: string;
};

// ─── GRID STATE PROGRESSION ───────────────────────────────────────────────────
// Each scenario has 4 states: stable → strain1 → strain2 → critical
type GridStateKey = "stable" | "strain1" | "strain2" | "critical" | "eu_restored";

type GridState = { demand: number; supply: number; stability: number; label: string; color: "ok"|"warn"|"danger"|"eu" };

const MARTA_GRID: Record<GridStateKey, GridState> = {
  stable:      { demand:120, supply:100, stability:60,  label:"Under pressure",   color:"warn" },
  strain1:     { demand:120, supply: 93, stability:42,  label:"Weakening",        color:"warn" },
  strain2:     { demand:120, supply: 85, stability:24,  label:"Critical",         color:"danger" },
  critical:    { demand:120, supply: 72, stability:8,   label:"Near collapse",    color:"danger" },
  eu_restored: { demand:120, supply:124, stability:95,  label:"Stabilised",       color:"eu" },
};

const LUCA_GRID: Record<GridStateKey, GridState> = {
  stable:      { demand:100, supply: 90, stability:55,  label:"Supply gap",       color:"warn" },
  strain1:     { demand:100, supply: 82, stability:38,  label:"Weakening",        color:"warn" },
  strain2:     { demand:100, supply: 74, stability:20,  label:"Critical",         color:"danger" },
  critical:    { demand:100, supply: 62, stability:6,   label:"Near collapse",    color:"danger" },
  eu_restored: { demand:100, supply:103, stability:92,  label:"Stabilised",       color:"eu" },
};

const SOFIA_GRID: Record<GridStateKey, GridState> = {
  stable:      { demand: 90, supply:130, stability:55,  label:"Overloaded",       color:"warn" },
  strain1:     { demand: 90, supply:138, stability:36,  label:"Worsening",        color:"warn" },
  strain2:     { demand: 90, supply:145, stability:18,  label:"Critical",         color:"danger" },
  critical:    { demand: 90, supply:152, stability:5,   label:"Near collapse",    color:"danger" },
  eu_restored: { demand: 90, supply: 93, stability:96,  label:"Balanced",         color:"eu" },
};

const GRIDS: Record<ScenarioId, Record<GridStateKey, GridState>> = { marta: MARTA_GRID, luca: LUCA_GRID, sofia: SOFIA_GRID };

// ─── LESSONS & SHARED STEPS ───────────────────────────────────────────────────

const LESSONS: Record<ScenarioId, string> = {
  marta: "A continental shock cannot always be solved inside one national grid. Interconnection turns isolated shortage into shared resilience.",
  luca:  "Energy integration protects both households and industry during shocks.",
  sofia: "A connected European grid turns renewable surges into shared energy, not instability.",
};



function reframe(id: ScenarioId): Step {
  const titles: Record<ScenarioId,string> = { marta:"Now try again — but not alone.", luca:"Now try again — with a connected European grid.", sofia:"Now try again — with a connected European grid." };
  const bodies: Record<ScenarioId,string[]> = {
    marta: ["This time, Marta's city is not limited to one national system.","Instead of relying only on domestic reserves, local cuts, and isolated backup, electricity can flow in from neighbouring countries through cross-border interconnections.","The crisis is still real.\nBut the response is now European."],
    luca:  ["This time, the response is not limited to one national electricity system.","Electricity can flow from neighbouring countries through European interconnectors.","The crisis is still real.\nBut the response is now larger than a single grid."],
    sofia: ["This time, the surplus electricity is not trapped inside one region.","Instead of shutting down renewable energy or overloading the grid, the system can send electricity to neighbouring countries where demand is higher.","Electricity can move across borders.\nThe grid becomes wider.\nAnd more flexible."],
  };
  return { id:"reframe", type:"reframe", title:titles[id], body:bodies[id], gridState:"critical", buttonLabel:"Use the EU Energy Single Market", nextStep:"eu_solution" };
}

function euSolution(id: ScenarioId): Step {
  const titles: Record<ScenarioId,string> = { marta:"Power can move where it is needed most.", luca:"Electricity flows across borders.", sofia:"Surplus electricity flows across Europe." };
  const bodies: Record<ScenarioId,string[]> = {
    marta: ["Electricity is imported from neighbouring countries. The wider grid absorbs the shock. What was a shortage inside one system becomes manageable across a connected one.","The supply gap closes. Frequency stabilizes. The heaters stay on.","In Marta's apartment, the lights do not go out.","The crisis does not disappear — but it no longer becomes collapse."],
    luca:  ["Power is imported from neighbouring European grids where supply is still available.","The wider network absorbs the shock.","Instead of competing for limited national electricity, the factory benefits from a connected system that can move energy where it is needed most.","Production continues.\nWorkers stay on the job."],
    sofia: ["Excess renewable electricity is exported through European interconnectors.","Regions with higher demand absorb the power.","The overload disappears.\nThe grid stabilizes.","Wind energy continues producing electricity — but now it benefits the entire network."],
  };
  return { id:"eu_solution", type:"eu_solution", title:titles[id], body:bodies[id], gridState:"eu_restored", buttonLabel:"See the outcome", nextStep:"success" };
}

function successStep(id: ScenarioId): Step {
  const map: Record<ScenarioId,Step> = {
    marta: { id:"success", type:"success", title:"Europe keeps the lights on.", body:["Because electricity could move across borders, Budapest avoided a wider blackout.","Marta's home stays heated.\nHospitals keep running.\nThe city remains functional."], gridState:"eu_restored" },
    luca:  { id:"success", type:"success", title:"The factory keeps running.", body:["Thanks to cross-border electricity flows, the regional shortage does not become an industrial shutdown.","Luca's plant continues operating. Orders remain on schedule. Workers keep their shifts.","What one national grid could not absorb alone, a connected European system could stabilize together."], gridState:"eu_restored" },
    sofia: { id:"success", type:"success", title:"Renewable energy powers more of Europe.", body:["Because electricity could move across borders, the surplus generation did not become a crisis.","Instead of shutting turbines down or collapsing the grid, Europe used the energy where it was needed.","Clean electricity continues flowing.\nThe system remains stable."], gridState:"eu_restored" },
  };
  return map[id];
}

// ─── SCENARIO DATA ────────────────────────────────────────────────────────────

const SCENARIOS: Record<ScenarioId, Scenario> = {
  marta: {
    id:"marta", name:"Marta Kovács", age:42, location:"Budapest", role:"Nurse", emoji:"👩",
    concern:"Keeping her home warm and stable during winter.",
    profileText:"Lives with her two children in a fifth-floor apartment.",
    crisisTitle:"Winter Energy Crisis", startStep:"opening",
    baseStats:{ demand:120, supply:100 },
    steps: {
      opening:{ id:"opening",type:"opening",title:"Marta's night begins normally.",body:["It is 19:45 in Budapest. Marta has just returned home after a long hospital shift. Her children are already inside. Dinner is half prepared. Outside, the temperature is dropping quickly.","For a moment, everything feels ordinary.","Then the lights flicker."],buttonLabel:"Continue",nextStep:"crisis" },
      crisis:{ id:"crisis",type:"crisis",title:"A regional energy shock is spreading.",body:["Across Central Europe, a severe cold wave is driving electricity demand up. At the same time, gas supply has tightened, putting pressure on power generation.","In Marta's district, the grid is still holding — but only just."],stats:{demand:120,supply:100},gridState:"stable",options:[{label:"Activate emergency gas plants",nextPath:"path_a1"},{label:"Reduce city electricity consumption",nextPath:"path_b1"},{label:"Switch to local backup generators",nextPath:"path_c1"}] },

      path_a1:{ id:"path_a1",type:"consequence",title:"A reasonable decision — but not enough.",gridState:"strain1",body:["Emergency gas plants are activated to stabilize supply. It buys time, but reserves are already too limited.","Electricity prices jump almost immediately. The pressure on the system eases for a moment, but demand is still too high for the available supply.","In Marta's apartment, the heating is still on.","For now."],buttonLabel:"What next?",nextStep:"path_a2" },
      path_a2:{ id:"path_a2",type:"decision",title:"The system is still under strain.",gridState:"strain1",body:["The first intervention slowed the crisis, but it did not solve it. The grid remains unstable, and more action is needed.","Marta checks her phone. Messages are already spreading in the neighbourhood chat:\n\"Did anyone else lose power for a second?\"\n\"Is the heating acting strange?\""],options:[{label:"Reduce city electricity consumption",nextPath:"path_a3a"},{label:"Switch to local backup generators",nextPath:"path_a3b"}] },
      path_a3a:{ id:"path_a3a",type:"consequence",title:"Demand falls — but not where it matters most.",gridState:"strain2",body:["The city begins cutting electricity use where it can. Street lighting dims. Public buildings reduce consumption. Some non-essential services are shut down.","But homes, hospitals, transport, and emergency services still need power. The cuts help, but not enough.","In Marta's kitchen, the lights flicker again. Her younger child asks if the power is going out.","Marta does not answer immediately."],buttonLabel:"Try the final option",nextStep:"forced_gen" },
      path_a3b:{ id:"path_a3b",type:"consequence",title:"Demand falls — but not where it matters most.",gridState:"strain2",body:["The city begins cutting electricity use where it can. Street lighting dims. Public buildings reduce consumption. Some non-essential services are shut down.","But homes, hospitals, transport, and emergency services still need power. The cuts help, but not enough.","In Marta's kitchen, the lights flicker again. Her younger child asks if the power is going out.","Marta does not answer immediately."],buttonLabel:"Try the final option",nextStep:"forced_cuts" },
      forced_gen:{ id:"forced_gen",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Switch to local backup generators",nextPath:"blackout_main"}] },
      forced_cuts:{ id:"forced_cuts",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Reduce city electricity consumption",nextPath:"blackout_main"}] },

      path_b1:{ id:"path_b1",type:"consequence",title:"The city cuts back — but the deficit remains.",gridState:"strain1",body:["Electricity use is reduced where possible. Street lighting is dimmed. Office buildings scale back. Public infrastructure enters emergency mode.","But the largest demand remains untouched: homes, hospitals, transport, and heating systems still need power.","The grid is still under pressure.","In Marta's apartment, the lights stay on. But the room feels colder already."],buttonLabel:"What next?",nextStep:"path_b2" },
      path_b2:{ id:"path_b2",type:"decision",title:"The first response was too small.",gridState:"strain1",body:["Demand has fallen slightly, but the shortfall remains. The city cannot save itself through conservation alone.","Marta plugs in her phone to charge. It starts charging — then stops — then starts again."],options:[{label:"Activate emergency gas plants",nextPath:"path_b3a"},{label:"Switch to local backup generators",nextPath:"path_b3b"}] },
      path_b3a:{ id:"path_b3a",type:"consequence",title:"More supply comes online — but the fuel is not there.",gridState:"strain2",body:["Emergency gas plants are activated, but reserves are already stretched thin. The added supply is costly and limited.","Prices surge. The system continues to wobble.","The apartment lights flicker once more. Marta checks the heater. Still working.","For now."],buttonLabel:"Try the final option",nextStep:"forced_genb" },
      path_b3b:{ id:"path_b3b",type:"consequence",title:"More supply comes online — but the fuel is not there.",gridState:"strain2",body:["Emergency gas plants are activated, but reserves are already stretched thin. The added supply is costly and limited.","Prices surge. The system continues to wobble.","The apartment lights flicker once more. Marta checks the heater. Still working.","For now."],buttonLabel:"Try the final option",nextStep:"forced_gasb" },
      forced_genb:{ id:"forced_genb",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Switch to local backup generators",nextPath:"blackout_main"}] },
      forced_gasb:{ id:"forced_gasb",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Activate emergency gas plants",nextPath:"blackout_main"}] },

      path_c1:{ id:"path_c1",type:"consequence",title:"Emergency backup cannot carry a city.",gridState:"strain1",body:["Generators begin to switch on across essential sites and local buildings. But backup systems were never designed to replace the grid at scale.","Fuel is limited. Coverage is uneven. Reliability drops fast.","Some lights stay on. Others do not.","In Marta's building, the hallway goes dark for several seconds before returning. Her children stop talking."],buttonLabel:"What next?",nextStep:"path_c2" },
      path_c2:{ id:"path_c2",type:"decision",title:"The emergency response is fragmenting.",gridState:"strain1",body:["Generators bought a few minutes, not stability. The city still lacks enough coordinated power to cover the gap.","You need another move."],options:[{label:"Activate emergency gas plants",nextPath:"path_c3a"},{label:"Reduce city electricity consumption",nextPath:"path_c3b"}] },
      path_c3a:{ id:"path_c3a",type:"consequence",title:"Fuel reserves are too tight.",gridState:"strain2",body:["Emergency plants come online, but gas availability is already too constrained. The added capacity slows the fall, but cannot reverse it.","Market prices spike. Confidence drops. The system remains unstable.","Marta opens the window slightly and hears something she did not notice before: the city is getting quieter."],buttonLabel:"Try the final option",nextStep:"forced_cutsc" },
      path_c3b:{ id:"path_c3b",type:"consequence",title:"Fuel reserves are too tight.",gridState:"strain2",body:["Emergency plants come online, but gas availability is already too constrained. The added capacity slows the fall, but cannot reverse it.","Market prices spike. Confidence drops. The system remains unstable.","Marta opens the window slightly and hears something she did not notice before: the city is getting quieter."],buttonLabel:"Try the final option",nextStep:"forced_gasc" },
      forced_cutsc:{ id:"forced_cutsc",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Reduce city electricity consumption",nextPath:"blackout_c"}] },
      forced_gasc:{ id:"forced_gasc",type:"forced",title:"Last available national measure",gridState:"critical",body:["There is one option left inside the national system."],options:[{label:"Activate emergency gas plants",nextPath:"blackout_c"}] },

      blackout_main:{ id:"blackout_main",type:"blackout",title:"The system breaks.",body:["Backup generators begin switching on across the city. Some work. Some fail. Some quickly run into fuel limits. The patchwork response is too weak to hold the pressure.","The grid frequency drops below safe levels.","Then Budapest loses power.","The apartment goes dark.\nThe heating cuts out.\nThe elevator stops.\nOutside, the city is no longer one city — just scattered windows and uncertainty."],blackoutLine:"Thousands of homes lose electricity.",buttonLabel:"What could have changed this?",nextStep:"reframe" },
      blackout_c:{ id:"blackout_c",type:"blackout",title:"The cuts come too late.",body:["The city reduces consumption where it can, but the system is already too unstable. The savings are too small, too late, and too uneven.","The grid collapses.","Budapest goes dark.","Marta reaches for her phone flashlight. The heating has stopped. The apartment begins to cool almost immediately."],blackoutLine:"A local response could not absorb a continental shock.",buttonLabel:"What could have changed this?",nextStep:"reframe" },
      reframe: reframe("marta"),
      eu_solution: euSolution("marta"),
      success: successStep("marta"),
    }
  },

  luca: {
    id:"luca", name:"Luca Bianchi", age:51, location:"Taranto, Italy", role:"Steel Factory Manager", emoji:"👨",
    concern:"Keeping production running during energy disruptions.",
    profileText:"Luca oversees operations at a large steel plant outside Taranto. Hundreds of workers rely on the plant staying operational.",
    crisisTitle:"Power Plant Shutdown", startStep:"opening",
    baseStats:{ demand:100, supply:90 },
    steps: {
      opening:{ id:"opening",type:"opening",title:"A normal morning at the factory.",body:["It is 06:20 in Taranto.","The factory floor is already active. Furnaces are running. Workers are arriving for the morning shift. Orders need to leave the plant before the end of the week.","Steel production cannot easily pause once the process has started.","Then a notification appears on Luca's control dashboard.","A major regional power plant has just shut down unexpectedly."],buttonLabel:"Continue",nextStep:"crisis" },
      crisis:{ id:"crisis",type:"crisis",title:"Electricity supply drops across the region.",body:["The shutdown removes a large share of generation from the national grid. Demand remains high as industry across southern Italy begins the workday.","Electricity prices are already climbing. The grid is under pressure.","For Luca's factory, interruptions could be extremely costly. Some production lines cannot simply restart once stopped."],stats:{demand:100,supply:90},gridState:"stable",options:[{label:"Buy emergency electricity on the national market",nextPath:"path_a1"},{label:"Reduce production to save energy",nextPath:"path_b1"},{label:"Wait for the national grid to stabilize",nextPath:"path_c1"}] },
      path_a1:{ id:"path_a1",type:"consequence",title:"Electricity is available — but at a cost.",gridState:"strain1",body:["The factory purchases emergency electricity on the national market. The supply is there, but competition for it is fierce.","Prices surge within minutes.","The furnaces continue running. Production lines stay active. But the cost of electricity is now several times higher than normal.","Luca checks the numbers.","If this continues for hours, the factory will start losing money on every ton produced."],buttonLabel:"What next?",nextStep:"path_a2" },
      path_a2:{ id:"path_a2",type:"decision",title:"The grid remains unstable.",gridState:"strain1",body:["Emergency purchases kept the plant running, but the national system is still short of electricity.","Other industries are drawing power at the same time.","Workers continue their shifts, unaware of how fragile the situation has become."],options:[{label:"Reduce production to save energy",nextPath:"path_a3a"},{label:"Wait for the national grid to stabilize",nextPath:"path_a3b"}] },
      path_a3a:{ id:"path_a3a",type:"consequence",title:"Production slows — but the pressure continues.",gridState:"strain2",body:["Some production lines are reduced or paused to lower electricity use. Workers are temporarily reassigned to other tasks.","Energy demand at the plant drops slightly.","But the regional electricity shortage remains unresolved. Orders will now be delayed. Contracts may be affected.","Luca watches the energy dashboard.","The system is getting weaker."],buttonLabel:"Try the final option",nextStep:"forced_wait_a" },
      path_a3b:{ id:"path_a3b",type:"consequence",title:"Production slows — but the pressure continues.",gridState:"strain2",body:["Some production lines are reduced or paused to lower electricity use. Workers are temporarily reassigned to other tasks.","Energy demand at the plant drops slightly.","But the regional electricity shortage remains unresolved. Orders will now be delayed. Contracts may be affected.","Luca watches the energy dashboard.","The system is getting weaker."],buttonLabel:"Try the final option",nextStep:"forced_reduce_a" },
      forced_wait_a:{ id:"forced_wait_a",type:"forced",title:"Only one option remains",gridState:"critical",body:["The national market has been exhausted. There is one move left."],options:[{label:"Wait for the national grid to stabilize",nextPath:"blackout_a"}] },
      forced_reduce_a:{ id:"forced_reduce_a",type:"forced",title:"Only one option remains",gridState:"critical",body:["The national market has been exhausted. There is one move left."],options:[{label:"Reduce production to save energy",nextPath:"blackout_a"}] },
      path_b1:{ id:"path_b1",type:"consequence",title:"Energy demand falls — but the shortage remains.",gridState:"strain1",body:["Luca orders a partial slowdown across several production lines. Energy consumption drops.","Workers are told to pause some operations while the grid stabilizes.","But the regional electricity gap is still there.","The plant is consuming less power — yet the system is still unstable. The factory is losing productivity without solving the crisis."],buttonLabel:"What next?",nextStep:"path_b2" },
      path_b2:{ id:"path_b2",type:"decision",title:"The system is still under pressure.",gridState:"strain1",body:["The slowdown bought time, but the shortage persists.","The plant cannot stay idle for long without serious consequences.","Luca needs another move."],options:[{label:"Buy emergency electricity on the national market",nextPath:"path_b3a"},{label:"Wait for the national grid to stabilize",nextPath:"path_b3b"}] },
      path_b3a:{ id:"path_b3a",type:"consequence",title:"Supply returns — but the cost explodes.",gridState:"strain2",body:["Emergency electricity is purchased to keep the remaining production lines active.","The factory resumes activity, but at extreme energy prices.","Margins collapse almost instantly.","If the situation continues, the factory could face severe financial losses. And the grid is still unstable."],buttonLabel:"Try the final option",nextStep:"forced_wait_b" },
      path_b3b:{ id:"path_b3b",type:"consequence",title:"Supply returns — but the cost explodes.",gridState:"strain2",body:["Emergency electricity is purchased to keep the remaining production lines active.","The factory resumes activity, but at extreme energy prices.","Margins collapse almost instantly.","If the situation continues, the factory could face severe financial losses. And the grid is still unstable."],buttonLabel:"Try the final option",nextStep:"forced_buy_b" },
      forced_wait_b:{ id:"forced_wait_b",type:"forced",title:"Only one option remains",gridState:"critical",body:["Time is running out."],options:[{label:"Wait for the national grid to stabilize",nextPath:"blackout_b"}] },
      forced_buy_b:{ id:"forced_buy_b",type:"forced",title:"Only one option remains",gridState:"critical",body:["Time is running out."],options:[{label:"Buy emergency electricity on the national market",nextPath:"blackout_b"}] },
      path_c1:{ id:"path_c1",type:"consequence",title:"Waiting increases the risk.",gridState:"strain1",body:["Luca decides not to act immediately.","The national grid operator is already working to rebalance supply and demand. Perhaps the situation will resolve itself.","But the shortage deepens.","Prices spike across the market. Other industries begin drawing emergency electricity. The factory is now competing for power with the entire region."],buttonLabel:"What next?",nextStep:"path_c2" },
      path_c2:{ id:"path_c2",type:"decision",title:"The window is closing.",gridState:"strain1",body:["Waiting has cost time and options. The regional grid is still short of power.","Luca needs to act now."],options:[{label:"Buy emergency electricity on the national market",nextPath:"path_c3a"},{label:"Reduce production to save energy",nextPath:"path_c3b"}] },
      path_c3a:{ id:"path_c3a",type:"consequence",title:"Supply returns — but the system is still fragile.",gridState:"strain2",body:["The factory secures emergency electricity, but the cost is enormous.","Production continues, but the financial pressure mounts.","Even worse, the regional grid remains unstable."],buttonLabel:"Try the final option",nextStep:"forced_reduce_c" },
      path_c3b:{ id:"path_c3b",type:"consequence",title:"Supply returns — but the system is still fragile.",gridState:"strain2",body:["The factory secures emergency electricity, but the cost is enormous.","Production continues, but the financial pressure mounts.","Even worse, the regional grid remains unstable."],buttonLabel:"Try the final option",nextStep:"forced_buy_c" },
      forced_reduce_c:{ id:"forced_reduce_c",type:"forced",title:"Only one option remains",gridState:"critical",body:["The grid is running out of time."],options:[{label:"Reduce production to save energy",nextPath:"blackout_c"}] },
      forced_buy_c:{ id:"forced_buy_c",type:"forced",title:"Only one option remains",gridState:"critical",body:["The grid is running out of time."],options:[{label:"Buy emergency electricity on the national market",nextPath:"blackout_c"}] },
      blackout_a:{ id:"blackout_a",type:"blackout",title:"The industrial zone loses power.",body:["The grid does not stabilize in time.","Instead, frequency drops across the regional network. To protect critical infrastructure, operators begin emergency shutdowns.","Power cuts ripple through the industrial zone.","Machines stop mid-process.\nThe furnaces shut down.\nWorkers stand still on the factory floor as the lights go out.","Restarting the plant could take days."],blackoutLine:"Production stops. Jobs and contracts are suddenly at risk.",buttonLabel:"What could have prevented this?",nextStep:"reframe" },
      blackout_b:{ id:"blackout_b",type:"blackout",title:"Stability never comes.",body:["The grid fails to recover in time.","Industrial areas begin losing power as the system protects itself from larger damage.","The steel plant shuts down abruptly.","Machines stop. Workers leave the floor.","A single regional outage has now halted an entire industrial operation."],blackoutLine:"A local grid could not absorb the shock.",buttonLabel:"What could have prevented this?",nextStep:"reframe" },
      blackout_c:{ id:"blackout_c",type:"blackout",title:"The shutdown arrives anyway.",body:["Reducing production comes too late to prevent the collapse of the regional grid.","Emergency shutdowns begin across the industrial zone.","Power disappears from the factory floor.","Production halts.","The day's work is lost — and restarting the plant will take time, money, and coordination."],blackoutLine:"A fragmented response could not hold the system together.",buttonLabel:"What could have changed this?",nextStep:"reframe" },
      reframe: reframe("luca"), eu_solution: euSolution("luca"), success: successStep("luca"),
    }
  },

  sofia: {
    id:"sofia", name:"Sofia Andersson", age:34, location:"Malmö, Sweden", role:"Electricity Grid Operator", emoji:"👩",
    concern:"Maintaining grid stability at 50 Hz.",
    profileText:"Sofia works in a regional control center that monitors and balances electricity flows across the grid. Her job is to keep the system stable — second by second.",
    crisisTitle:"Renewable Surge", startStep:"opening",
    baseStats:{ demand:90, supply:130 },
    steps: {
      opening:{ id:"opening",type:"opening",title:"A normal shift at the control center.",body:["It is 11:10 in Malmö.","Sofia is watching the grid monitoring screens in the control room. Wind conditions across Northern Europe are unusually strong today.","That normally means good news.","Wind turbines are producing huge amounts of electricity.","But the numbers on Sofia's dashboard are climbing faster than expected. Generation is rising far above local demand.","For a moment, the system still holds.","Then a warning appears.","Transmission lines are approaching their limits."],buttonLabel:"Continue",nextStep:"crisis" },
      crisis:{ id:"crisis",type:"crisis",title:"The grid is overloaded with electricity.",body:["Wind farms across Northern Europe are producing massive amounts of power.","But local demand cannot absorb it all.","Electricity is flooding parts of the grid faster than it can be distributed.","If the imbalance continues, the system could become unstable."],stats:{demand:90,supply:130},gridState:"stable",options:[{label:"Shut down wind farms",nextPath:"path_a1"},{label:"Store the surplus electricity in batteries",nextPath:"path_b1"},{label:"Reduce turbine output across the region",nextPath:"path_c1"}] },
      path_a1:{ id:"path_a1",type:"consequence",title:"Clean energy is wasted.",gridState:"strain1",body:["Wind farms begin shutting down across the region to reduce electricity production.","The immediate overload decreases.","But shutting down large wind installations is slow and inefficient.","At the same time, other parts of the grid are still producing large amounts of electricity.","The imbalance shifts — but it does not disappear.","Sofia watches the system maps.","The grid is still under stress."],buttonLabel:"What next?",nextStep:"path_a2" },
      path_a2:{ id:"path_a2",type:"decision",title:"The surplus keeps moving through the system.",gridState:"strain1",body:["Curtailing wind generation reduced part of the problem.","But other renewable sources are still pushing electricity into the network. Transmission lines remain overloaded.","The control room becomes quieter.","Everyone is watching the same numbers."],options:[{label:"Store electricity in batteries",nextPath:"path_a3a"},{label:"Reduce turbine output everywhere",nextPath:"path_a3b"}] },
      path_a3a:{ id:"path_a3a",type:"consequence",title:"Storage capacity is too small.",gridState:"strain2",body:["Battery storage systems begin absorbing electricity from the grid.","But the volume of surplus energy is far larger than the available storage capacity.","Within minutes, the batteries are full.","The grid is still carrying more electricity than it can safely handle.","The warning alarms begin appearing across multiple regions."],buttonLabel:"Try the final option",nextStep:"forced_reduce_a" },
      path_a3b:{ id:"path_a3b",type:"consequence",title:"Storage capacity is too small.",gridState:"strain2",body:["Battery storage systems begin absorbing electricity from the grid.","But the volume of surplus energy is far larger than the available storage capacity.","Within minutes, the batteries are full.","The grid is still carrying more electricity than it can safely handle.","The warning alarms begin appearing across multiple regions."],buttonLabel:"Try the final option",nextStep:"forced_store_a" },
      forced_reduce_a:{ id:"forced_reduce_a",type:"forced",title:"Last available option",gridState:"critical",body:["The alarms are spreading. One option remains."],options:[{label:"Reduce turbine output everywhere",nextPath:"blackout_a"}] },
      forced_store_a:{ id:"forced_store_a",type:"forced",title:"Last available option",gridState:"critical",body:["The alarms are spreading. One option remains."],options:[{label:"Store electricity in batteries",nextPath:"blackout_a"}] },
      path_b1:{ id:"path_b1",type:"consequence",title:"Storage helps — but only briefly.",gridState:"strain1",body:["Battery systems begin absorbing excess electricity from the grid.","For a moment, the numbers stabilize.","But the surge of renewable generation is too large.","Within minutes, storage capacity is completely filled.","Electricity continues flooding into the system.","The overload returns."],buttonLabel:"What next?",nextStep:"path_b2" },
      path_b2:{ id:"path_b2",type:"decision",title:"The batteries are full. The surge continues.",gridState:"strain1",body:["Storage bought seconds, not stability.","Sofia calls across the control room. The team is already on it.","Another option — now."],options:[{label:"Shut down wind farms",nextPath:"path_b3a"},{label:"Reduce turbine output everywhere",nextPath:"path_b3b"}] },
      path_b3a:{ id:"path_b3a",type:"consequence",title:"Curtailment slows the surge.",gridState:"strain2",body:["Wind farms begin shutting down to reduce generation.","But curtailment is uneven and slow. Some turbines stop immediately. Others continue running.","The imbalance moves through the grid faster than the shutdown can contain it.","Transmission lines remain under pressure."],buttonLabel:"Try the final option",nextStep:"forced_reduce_b" },
      path_b3b:{ id:"path_b3b",type:"consequence",title:"Curtailment slows the surge.",gridState:"strain2",body:["Wind farms begin shutting down to reduce generation.","But curtailment is uneven and slow. Some turbines stop immediately. Others continue running.","The imbalance moves through the grid faster than the shutdown can contain it.","Transmission lines remain under pressure."],buttonLabel:"Try the final option",nextStep:"forced_shut_b" },
      forced_reduce_b:{ id:"forced_reduce_b",type:"forced",title:"Last available option",gridState:"critical",body:["The grid is near its limit."],options:[{label:"Reduce turbine output everywhere",nextPath:"blackout_b"}] },
      forced_shut_b:{ id:"forced_shut_b",type:"forced",title:"Last available option",gridState:"critical",body:["The grid is near its limit."],options:[{label:"Shut down wind farms",nextPath:"blackout_b"}] },
      path_c1:{ id:"path_c1",type:"consequence",title:"The adjustment comes too slowly.",gridState:"strain1",body:["Grid operators begin coordinating turbine reductions across the region.","But renewable generation is spread across thousands of installations. Reducing output across all of them takes time.","Meanwhile, electricity continues to flood the grid. Transmission lines are still approaching their limits.","Sofia watches another alarm appear."],buttonLabel:"What next?",nextStep:"path_c2" },
      path_c2:{ id:"path_c2",type:"decision",title:"The turbine reductions are too slow.",gridState:"strain1",body:["The coordination effort is underway — but not fast enough.","More alarms light up across the control board.","Sofia needs another intervention, immediately."],options:[{label:"Shut down wind farms",nextPath:"path_c3a"},{label:"Store electricity in batteries",nextPath:"path_c3b"}] },
      path_c3a:{ id:"path_c3a",type:"consequence",title:"Storage fills instantly.",gridState:"strain2",body:["Battery systems absorb electricity, but the surge is far larger than available storage capacity.","Within minutes, every battery system is full.","The grid remains overloaded."],buttonLabel:"Try the final option",nextStep:"forced_shut_c" },
      path_c3b:{ id:"path_c3b",type:"consequence",title:"Storage fills instantly.",gridState:"strain2",body:["Battery systems absorb electricity, but the surge is far larger than available storage capacity.","Within minutes, every battery system is full.","The grid remains overloaded."],buttonLabel:"Try the final option",nextStep:"forced_store_c" },
      forced_shut_c:{ id:"forced_shut_c",type:"forced",title:"Last available option",gridState:"critical",body:["Time has run out."],options:[{label:"Shut down wind farms",nextPath:"blackout_c"}] },
      forced_store_c:{ id:"forced_store_c",type:"forced",title:"Last available option",gridState:"critical",body:["Time has run out."],options:[{label:"Store electricity in batteries",nextPath:"blackout_c"}] },
      blackout_a:{ id:"blackout_a",type:"blackout",title:"The grid becomes unstable.",body:["Wind turbine output is reduced across the region.","But the cuts happen too slowly and unevenly.","Overloaded transmission lines begin shutting down automatically to protect themselves.","When one line trips, power is suddenly pushed onto others.","Then another line trips.","The cascade spreads.","Parts of the grid collapse.","Cities lose electricity — even though there is more than enough power being generated."],blackoutLine:"The system fails not from shortage — but from imbalance.",buttonLabel:"What could have prevented this?",nextStep:"reframe" },
      blackout_b:{ id:"blackout_b",type:"blackout",title:"The grid protection systems activate.",body:["Multiple transmission lines automatically shut down to prevent physical damage.","But when one part of the network disconnects, electricity is forced onto others.","The overload spreads across the system.","Large sections of the grid lose synchronization.","Cities across the region lose power.","Even though turbines are still spinning."],blackoutLine:"Too much electricity — in the wrong place — can still cause a blackout.",buttonLabel:"What could have prevented this?",nextStep:"reframe" },
      blackout_c:{ id:"blackout_c",type:"blackout",title:"Curtailment comes too late.",body:["Wind farms begin shutting down — but the grid has already become unstable.","Transmission lines trip one after another. Electricity flows shift suddenly across the network.","The cascade spreads.","Cities lose power.","Not because Europe lacks electricity.","But because the system could not move it where it was needed."],blackoutLine:"Abundance becomes instability.",buttonLabel:"What could have prevented this?",nextStep:"reframe" },
      reframe: reframe("sofia"), eu_solution: euSolution("sofia"), success: successStep("sofia"),
    }
  }
};

// ─── TYPEWRITER HOOK ──────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 16) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = useRef(0);

  const skip = () => { if(timer.current) clearTimeout(timer.current); setDisplayed(text); setDone(true); };

  useEffect(() => {
    setDisplayed(""); setDone(false); idx.current = 0;
    if(timer.current) clearTimeout(timer.current);
    function tick() {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if(idx.current < text.length) timer.current = setTimeout(tick, speed);
      else setDone(true);
    }
    timer.current = setTimeout(tick, speed);
    return () => { if(timer.current) clearTimeout(timer.current); };
  }, [text]);

  return { displayed, done, skip };
}

// ─── STORY TEXT ───────────────────────────────────────────────────────────────

function StoryText({ paragraphs, onDone, dark=false }: { paragraphs: string[]; onDone: () => void; dark?: boolean }) {
  const full = paragraphs.join("\n\n");
  const { displayed, done, skip } = useTypewriter(full);
  useEffect(() => { if(done) onDone(); }, [done]);
  return (
    <div className="story-text" onClick={!done ? skip : undefined} style={{ cursor: done ? "default" : "pointer" }}>
      {displayed.split("\n\n").map((para, i) => (
        <p key={i} className={`story-para ${dark ? "story-para-dark" : ""}`}>
          {para.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length-1 && <br/>}</span>)}
        </p>
      ))}
      {!done && <span className="cursor-blink" aria-hidden>|</span>}
      {!done && <p className="skip-hint">click to skip</p>}
    </div>
  );
}

// ─── GRID DASHBOARD ───────────────────────────────────────────────────────────

function GridDashboard({ scenarioId, gridState, dark=false }: { scenarioId: ScenarioId; gridState: GridStateKey; dark?: boolean }) {
  const g = GRIDS[scenarioId][gridState];
  const isEU = gridState === "eu_restored";
  const isSofia = scenarioId === "sofia";

  // For Sofia, surplus means supply > demand → show differently
  const demandPct  = isSofia ? 100 : Math.min(100, (g.demand / 140) * 100);
  const supplyPct  = isSofia ? Math.min(100, (g.supply / 160) * 100) : Math.min(100, (g.supply / 140) * 100);
  const stabilityPct = g.stability;

  const barColor = isEU ? "var(--mint)" : g.color === "danger" ? "#e05c5c" : "var(--amber)";
  const supplyColor = isSofia
    ? (isEU ? "var(--mint)" : g.color === "danger" ? "#e05c5c" : "var(--amber)")
    : (isEU ? "var(--mint)" : g.color === "danger" ? "#e05c5c" : "var(--amber)");

  return (
    <div className={`grid-dash ${dark ? "grid-dash-dark" : ""} ${isEU ? "grid-dash-eu" : ""} ${g.color === "danger" && !isEU ? "grid-dash-danger" : ""}`}>
      <div className="grid-dash-header">
        <span className="grid-dash-title">Grid status</span>
        <span className={`grid-dash-label label-${g.color}`}>{g.label}</span>
      </div>
      <div className="grid-dash-rows">
        <div className="grid-dash-row">
          <span className="grid-dash-rowlabel">Demand</span>
          <div className="grid-dash-track">
            <div className="grid-dash-fill fill-demand" style={{ width:`${demandPct}%` }} />
          </div>
          <span className="grid-dash-val">{g.demand}</span>
        </div>
        <div className="grid-dash-row">
          <span className="grid-dash-rowlabel">Supply</span>
          <div className="grid-dash-track">
            <div className="grid-dash-fill" style={{ width:`${supplyPct}%`, background: supplyColor }} />
          </div>
          <span className="grid-dash-val">{g.supply}</span>
        </div>
        <div className="grid-dash-row">
          <span className="grid-dash-rowlabel">Stability</span>
          <div className="grid-dash-track">
            <div className="grid-dash-fill fill-stability" style={{ width:`${stabilityPct}%`, background: barColor, transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
          <span className="grid-dash-val">{stabilityPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── EU FLOW DIAGRAM — geographic country silhouettes ─────────────────────────

// Simplified country shapes as SVG paths, scaled to a 700x380 viewBox.
// Paths are hand-simplified polygonal approximations of real geography.
// Each scenario has its own set: center country + 4 neighbours at correct positions.

type CountryShape = { id: string; label: string; path: string; labelX: number; labelY: number; isCenter?: boolean };

const COUNTRY_SHAPES: Record<ScenarioId, { direction:"in"|"out"; countries: CountryShape[]; connections: [string,string][] }> = {
  // ── MARTA / HUNGARY — Central Europe, Mercator-projected from real Natural Earth coords ──
  marta: {
    direction: "in",
    connections: [["austria","hungary"],["slovakia","hungary"],["romania","hungary"],["croatia","hungary"]],
    countries: [
      { id:"hungary", label:"Hungary", isCenter: true, labelX:329.2, labelY:126.8,
        path:"M 243.7,127.9 L 270.6,139.6 L 318.5,143.5 L 357.5,151.2 L 399.4,147.3 L 420.4,135.7 L 444.4,124.0 L 420.4,104.4 L 372.5,108.4 L 321.5,104.4 L 282.6,124.0 L 261.6,112.3 L 252.7,124.0 L 243.7,127.9 Z" },
      { id:"austria", label:"Austria", labelX:143.3, labelY:148.3,
        path:"M 43.0,147.3 L 69.9,151.2 L 123.9,162.7 L 147.8,147.3 L 177.8,127.9 L 207.7,127.9 L 264.6,104.4 L 270.6,120.1 L 228.7,139.6 L 180.8,189.4 L 129.8,178.0 L 72.9,170.4 L 46.0,162.7 L 43.0,147.3 Z" },
      { id:"slovakia", label:"Slovakia", labelX:350.5, labelY:98.4,
        path:"M 261.6,112.3 L 297.6,96.5 L 333.5,76.6 L 369.5,72.6 L 405.4,72.6 L 435.4,84.6 L 444.4,112.3 L 420.4,104.4 L 372.5,108.4 L 321.5,104.4 L 282.6,124.0 L 261.6,112.3 Z" },
      { id:"romania", label:"Romania", labelX:496.9, labelY:213.0,
        path:"M 444.4,124.0 L 480.3,131.8 L 522.2,131.8 L 579.1,143.5 L 645.0,223.2 L 648.0,252.7 L 615.1,289.1 L 570.2,281.9 L 534.2,289.1 L 483.3,289.1 L 453.3,278.3 L 420.4,260.1 L 399.4,234.3 L 384.4,208.2 L 402.4,193.2 L 420.4,166.6 L 444.4,124.0 Z" },
      { id:"croatia", label:"Croatia", labelX:239.8, labelY:237.3,
        path:"M 168.8,223.2 L 207.7,234.3 L 237.7,185.6 L 267.6,196.9 L 324.5,208.2 L 330.5,234.3 L 315.6,241.7 L 285.6,278.3 L 264.6,296.3 L 240.7,260.1 L 204.7,252.7 L 174.8,252.7 L 165.8,234.3 L 168.8,223.2 Z" },
    ],
  },

  // ── LUCA / ITALY — Western/Central Europe ──
  luca: {
    direction: "in",
    connections: [["france","italy"],["switzerland","italy"],["slovenia","italy"],["austria","italy"]],
    countries: [
      { id:"italy", label:"Italy", isCenter: true, labelX:493.9, labelY:298.0,
        path:"M 378.8,289.5 L 406.2,286.7 L 562.4,283.9 L 589.8,344.0 L 610.0,390.0 L 576.1,373.2 L 524.0,341.3 L 493.9,292.3 L 447.3,275.6 L 414.4,286.7 L 398.0,281.2 L 378.8,289.5 Z" },
      { id:"france", label:"France", labelX:237.8, labelY:199.4,
        path:"M 60.9,156.8 L 192.4,73.2 L 277.4,82.8 L 362.3,123.3 L 400.7,159.8 L 400.7,180.7 L 378.8,215.9 L 384.3,286.7 L 280.1,330.5 L 200.6,319.7 L 137.6,303.3 L 143.1,227.4 L 49.9,174.8 L 60.9,156.8 Z" },
      { id:"switzerland", label:"Switzerland", labelX:402.2, labelY:204.2,
        path:"M 356.9,180.7 L 398.0,180.7 L 428.1,174.8 L 452.8,183.7 L 480.2,201.3 L 439.1,227.4 L 414.4,227.4 L 387.0,283.9 L 356.9,215.9 L 354.1,189.6 L 356.9,180.7 Z" },
      { id:"slovenia", label:"Slovenia", labelX:598.9, labelY:227.4,
        path:"M 567.9,241.7 L 578.8,215.9 L 606.2,207.1 L 630.9,213.0 L 644.6,213.0 L 619.9,233.2 L 600.7,241.7 L 573.3,238.9 L 567.9,241.7 Z" },
      { id:"austria", label:"Austria", labelX:544.6, labelY:184.4,
        path:"M 452.8,183.7 L 477.4,186.6 L 526.8,195.4 L 548.7,183.7 L 576.1,168.8 L 603.5,168.8 L 655.6,150.8 L 661.0,162.8 L 622.7,177.7 L 578.8,215.9 L 532.2,207.1 L 480.2,201.3 L 455.5,195.4 L 452.8,183.7 Z" },
    ],
  },

  // ── SOFIA / SWEDEN — Northern Europe ──
  sofia: {
    direction: "out",
    connections: [["sweden","denmark"],["sweden","germany"],["sweden","finland"],["sweden","poland"]],
    countries: [
      { id:"sweden", label:"Sweden", isCenter: true, labelX:265.8, labelY:210.0,
        path:"M 161.6,293.9 L 164.0,276.5 L 149.6,254.2 L 168.7,239.7 L 164.0,223.3 L 195.0,187.0 L 230.7,153.0 L 290.4,104.7 L 326.1,92.8 L 373.9,82.6 L 469.3,144.0 L 433.5,180.3 L 354.8,230.8 L 326.1,254.2 L 338.1,273.7 L 302.3,291.3 L 242.7,301.8 L 197.3,292.6 L 161.6,293.9 Z" },
      { id:"finland", label:"Finland", labelX:475.2, labelY:167.0,
        path:"M 373.9,235.3 L 421.6,238.2 L 469.3,232.3 L 538.4,230.8 L 610.0,223.3 L 650.5,193.5 L 588.5,175.3 L 610.0,138.6 L 588.5,65.8 L 517.0,59.4 L 421.6,88.7 L 373.9,82.6 L 326.1,92.8 L 385.8,149.4 L 354.8,230.8 L 373.9,235.3 Z" },
      { id:"denmark", label:"Denmark", labelX:136.8, labelY:299.0,
        path:"M 90.0,306.9 L 123.4,308.2 L 156.8,296.5 L 199.7,295.2 L 192.6,301.8 L 154.4,306.9 L 132.9,301.8 L 123.4,310.8 L 104.3,308.2 L 90.0,306.9 Z" },
      { id:"germany", label:"Germany", labelX:133.1, labelY:350.0,
        path:"M 42.3,357.1 L 75.7,336.9 L 97.2,320.9 L 137.7,306.9 L 185.4,312.0 L 230.7,315.8 L 254.6,354.8 L 254.6,358.3 L 195.0,364.1 L 206.9,385.6 L 187.8,393.3 L 144.9,396.6 L 104.3,395.5 L 75.7,395.5 L 78.1,386.7 L 44.7,373.2 L 37.5,355.9 L 42.3,357.1 Z" },
      { id:"poland", label:"Poland", labelX:350.8, labelY:338.3,
        path:"M 230.7,315.8 L 278.4,313.3 L 338.1,309.5 L 366.7,314.6 L 440.6,314.6 L 457.3,325.8 L 469.3,334.4 L 466.9,345.3 L 435.9,355.9 L 397.7,374.4 L 350.0,376.6 L 290.4,365.2 L 254.6,358.3 L 254.6,354.8 L 230.7,315.8 Z" },
    ],
  },
};



function EuFlowDiagram({ scenarioId }: { scenarioId: ScenarioId }) {
  const cfg = COUNTRY_SHAPES[scenarioId];
  // 4-phase cinematic reveal:
  // phase 0 = all hidden
  // phase 1 = center country glows
  // phase 2 = connection lines light up one by one
  // phase 3 = neighbour countries glow
  // phase 4 = "stabilised" badge appears
  const [phase, setPhase] = useState(0);
  const [linePhase, setLinePhase] = useState(0); // 0..4 lines revealed

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 900);
    // Stagger lines
    const tl = [1,2,3,4].map((n, i) =>
      setTimeout(() => setLinePhase(n), 1100 + i * 320)
    );
    const t3 = setTimeout(() => setPhase(3), 2500);
    const t4 = setTimeout(() => setPhase(4), 3000);
    return () => { [t1,t2,t3,t4,...tl].forEach(clearTimeout); };
  }, []);

  const W = 700, H = scenarioId === "luca" ? 420 : scenarioId === "sofia" ? 420 : 360;
  const center = cfg.countries.find(c => c.isCenter)!;
  const cx = center.labelX, cy = center.labelY;

  return (
    <div className="eu-diagram">
      <div className="eu-diagram-header">
        <span className="eu-diagram-label">Cross-border electricity flows</span>
        <span className="eu-diagram-sub">The EU includes over 400 interconnectors between countries</span>
      </div>

      <div className="eu-map-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="eu-map-svg" aria-hidden>
          <defs>
            <filter id="glow-center" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-nbr" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── BACKGROUND: subtle latitude grid (cartographic style) ── */}
          {/* horizontal latitude lines */}
          {[60,100,140,180,220,260,300,340,380].filter(y => y < H).map(y => (
            <line key={`lat-${y}`} x1="0" y1={y} x2={W} y2={y} stroke="rgba(0,50,120,0.05)" strokeWidth="1"/>
          ))}
          {/* vertical longitude lines */}
          {[70,140,210,280,350,420,490,560,630].map(x => (
            <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2={H} stroke="rgba(0,50,120,0.05)" strokeWidth="1"/>
          ))}

          {/* ── NEIGHBOUR COUNTRIES (drawn before center so center is on top) ── */}
          {cfg.countries.filter(c => !c.isCenter).map((country) => {
            const nbVisible = phase >= 3;
            return (
              <g key={country.id}>
                {/* Drop shadow for depth */}
                {nbVisible && (
                  <path d={country.path} fill="rgba(0,0,0,0.06)" transform="translate(2,3)" />
                )}
                {/* Country shape — FT-style: warm stone before, amber glow after */}
                <path
                  d={country.path}
                  fill={nbVisible ? "rgba(255,200,80,0.28)" : "rgba(232,238,228,0.88)"}
                  stroke={nbVisible ? "#e09000" : "rgba(100,130,110,0.45)"}
                  strokeWidth={nbVisible ? "1.6" : "1.2"}
                  strokeLinejoin="round"
                  style={{ transition: "fill 0.7s ease, stroke 0.6s ease, stroke-width 0.4s ease" }}
                  filter={nbVisible ? "url(#glow-nbr)" : undefined}
                />
                {/* Country label */}
                <rect
                  x={country.labelX - country.label.length * 3.6 - 5}
                  y={country.labelY - 8}
                  width={country.label.length * 7.2 + 10}
                  height="17"
                  rx="3"
                  fill={nbVisible ? "rgba(255,244,200,0.88)" : "rgba(255,255,255,0.72)"}
                  stroke={nbVisible ? "rgba(200,140,0,0.25)" : "rgba(0,0,0,0.08)"}
                  strokeWidth="0.8"
                  style={{ transition: "fill 0.5s ease" }}
                />
                <text
                  x={country.labelX} y={country.labelY + 4}
                  textAnchor="middle" dominantBaseline="middle"
                  style={{
                    font: `700 10px/1 "Outfit",sans-serif`,
                    fill: nbVisible ? "#7a4000" : "#3a4a3a",
                    transition: "fill 0.5s ease",
                    letterSpacing: "0.03em",
                  }}
                >
                  {country.label}
                </text>
              </g>
            );
          })}

          {/* ── CONNECTION LINES ── */}
          {cfg.connections.map(([fromId, toId], i) => {
            const lineVisible = linePhase > i;
            const fromCountry = cfg.countries.find(c => c.id === fromId)!;
            const toCountry = cfg.countries.find(c => c.id === toId)!;
            const fx = fromCountry.labelX, fy = fromCountry.labelY;
            const tx = toCountry.labelX, ty = toCountry.labelY;
            // Slight curve
            const mx = (fx+tx)/2 + (ty-fy)*0.12;
            const my = (fy+ty)/2 - (tx-fx)*0.12;
            const d = `M${fx},${fy} Q${mx},${my} ${tx},${ty}`;
            const pathId = `conn-${scenarioId}-${i}`;
            return (
              <g key={`${fromId}-${toId}`} style={{ opacity: lineVisible ? 1 : 0, transition: "opacity 0.5s ease" }}>
                {/* Background track */}
                <path d={d} fill="none" stroke="rgba(255,184,48,0.2)" strokeWidth="4" strokeLinecap="round"/>
                {/* Glowing animated line */}
                <path
                  d={d} fill="none" stroke="#ffb830" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="7 5"
                  filter="url(#glow-line)"
                  style={{ animation: lineVisible ? `flowDash 1.6s linear infinite ${i*200}ms` : "none" }}
                />
                {/* Travelling energy dot */}
                {lineVisible && (
                  <circle r="4.5" fill="#ffb830" filter="url(#glow-line)">
                    <animateMotion dur="2s" repeatCount="indefinite" begin={`${i*0.4}s`}>
                      <mpath href={`#${pathId}`}/>
                    </animateMotion>
                  </circle>
                )}
                <path id={pathId} d={d} fill="none" stroke="none"/>
                {/* Directional arrow tip near center */}
                {lineVisible && (() => {
  const t = 0.8;
  const arrowX = fx * (1 - t) * (1 - t) + 2 * mx * (1 - t) * t + tx * t * t;
  const arrowY = fy * (1 - t) * (1 - t) + 2 * my * (1 - t) * t + ty * t * t;
  return (
    <circle cx={arrowX} cy={arrowY} r="2.5" fill="#ffb830" opacity="0.7" />
  );
})()}
              </g>
            );
          })}

          {/* ── CENTER COUNTRY ── */}
          {(() => {
            const glowing = phase >= 1;
            return (
              <g>
                {/* Drop shadow */}
                <path d={center.path} fill="rgba(0,0,0,0.08)" transform="translate(2,4)" />
                {/* Pulsing glow halo around the shape */}
                {glowing && (
                  <path
                    d={center.path}
                    fill="none"
                    stroke="rgba(59,195,150,0.5)"
                    strokeWidth="8"
                    filter="url(#glow-center)"
                    style={{ animation: "haloPulse 2s ease-in-out infinite" }}
                  />
                )}
                {/* Country silhouette — deep green campaign color when active */}
                <path
                  d={center.path}
                  fill={glowing ? "rgba(59,195,150,0.42)" : "rgba(232,238,228,0.88)"}
                  stroke={glowing ? "#28a87e" : "rgba(100,130,110,0.45)"}
                  strokeWidth={glowing ? "2" : "1.2"}
                  strokeLinejoin="round"
                  filter={glowing ? "url(#glow-center)" : undefined}
                  style={{ transition: "fill 0.7s ease, stroke 0.7s ease" }}
                />
                {/* ⚡ icon */}
                {glowing && (
                  <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize:"15px", fill:"#0a5c3e", filter:"drop-shadow(0 1px 2px rgba(255,255,255,0.8))" }}>⚡</text>
                )}
                {/* Country name label */}
                <rect
                  x={cx - center.label.length * 4 - 7} y={cy + 4}
                  width={center.label.length * 8 + 14} height="18" rx="4"
                  fill={glowing ? "rgba(210,248,236,0.92)" : "rgba(255,255,255,0.75)"}
                  stroke={glowing ? "rgba(40,168,126,0.4)" : "rgba(0,0,0,0.08)"}
                  strokeWidth="0.8"
                  style={{ transition: "fill 0.6s ease" }}
                />
                <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
                  style={{ font:`800 11.5px/1 "Outfit",sans-serif`, fill: glowing ? "#0a5c3e" : "#3a4a3a", letterSpacing:"0.03em" }}>
                  {center.label}
                </text>
              </g>
            );
          })()}

          {/* ── STABILISED BADGE ── */}
          {phase >= 4 && (
            <g style={{ animation: "fadeUp 0.5s ease both" }}>
              <rect x={W/2-78} y={H-44} width="156" height="30" rx="15"
                fill="#3bc396" opacity="0.95"/>
              <text x={W/2} y={H-25} textAnchor="middle" dominantBaseline="middle"
                style={{ font:`700 11px/1 "Outfit",sans-serif`, fill:"white", letterSpacing:"0.08em" }}>
                ✓ {center.label} grid stabilised
              </text>
            </g>
          )}
        </svg>

        <style>{`
          @keyframes flowDash { to { stroke-dashoffset: -24; } }
          @keyframes haloPulse {
            0%,100% { stroke-opacity: 0.4; stroke-width: 6; }
            50%      { stroke-opacity: 0.75; stroke-width: 10; }
          }
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(8px); }
            to   { opacity:1; transform:translateY(0); }
          }
        `}</style>
      </div>

      <p className="eu-data-note">Based on real European grid dynamics. Cross-border electricity flows helped prevent shortages during the 2021–2022 energy crisis.</p>
    </div>
  );
}

// ─── DISCLAIMER MODAL ─────────────────────────────────────────────────────────

function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-icon">⚡</div>
        <h2 className="modal-title">This is a simulation</h2>
        <p className="modal-body">
          The characters, situations, and events in this experience are entirely fictional and created for educational purposes. They are not based on real individuals or actual incidents.
        </p>
        <p className="modal-body">
          The energy dynamics are inspired by how European electricity grids actually work, but all scenarios are simplified for storytelling.
        </p>
        <div className="modal-footer">
          <button className="btn btn-navy modal-btn" onClick={onAccept}>
            I understand — start the experience →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function Nav({ dark=false, onBack }: { dark?: boolean; onBack?: () => void }) {
  return (
    <nav className={`nav ${dark ? "nav-dark" : ""}`}>
      <div className="nav-brand">
        <img src="/eu-power-logo.png" alt="EU Power" className="nav-logo" />
        <div className="nav-wordmark">
          <span className={`nav-title ${dark ? "nav-title-dark" : ""}`}>EU POWER</span>
          <span className={`nav-sub ${dark ? "nav-sub-dark" : ""}`}>One grid. One EU.</span>
        </div>
      </div>
      {onBack && (
        <button className="nav-back" style={dark ? { borderColor:"rgba(255,255,255,0.2)", color:"white" } : {}} onClick={onBack}>
          ← Profiles
        </button>
      )}
    </nav>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [activeId, setActiveId] = useState<ScenarioId | null>(null);
  const [stepId, setStepId] = useState("opening");
  const [pageKey, setPageKey] = useState(0);
  const [showSocials, setShowSocials] = useState(false);

  function play(id: ScenarioId) {
    setActiveId(id); setStepId(SCENARIOS[id].startStep); setPageKey(k => k+1); setShowSocials(false);
  }
  function nav(next: string) { setStepId(next); setPageKey(k => k+1); }
  function home() { setActiveId(null); setShowSocials(false); setPageKey(k => k+1); }

  if(!disclaimerAccepted) return <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} />;
  if(showSocials) return <SocialsScreen onHome={home} pageKey={pageKey} />;
  if(!activeId) return <HomeScreen onPlay={play} pageKey={pageKey} />;

  const scenario = SCENARIOS[activeId];
  const step = scenario.steps[stepId];
  if(!step) return null;

  return <PlayScreen key={pageKey} scenario={scenario} step={step} onNav={nav} onHome={home} onReplay={() => play(activeId)} onShowSocials={() => setShowSocials(true)} />;
}

// ─── SOCIALS SCREEN ──────────────────────────────────────────────────────────

function SocialsScreen({ onHome, pageKey }: { onHome: () => void; pageKey: number }) {
  return (
    <main className="shell shell-socials">
      <Nav onBack={onHome} />
      <div className="socials-page transition-wrapper" key={pageKey}>

        <div className="socials-page-inner">
          <p className="eyebrow">Stay connected</p>
          <h1 className="socials-title">Keep up with the EU Energy Single Market</h1>
          <p className="socials-subtitle">
            This experience is part of a campaign to explain how Europe's interconnected electricity system works — and why it matters.
          </p>

          <a
            className="campaign-site-card"
            href="https://eu-singlemarket-energy-campaign.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="campaign-site-left">
              <span className="campaign-site-icon">⚡</span>
              <div>
                <p className="campaign-site-title">EU Energy Single Market</p>
                <p className="campaign-site-url">eu-singlemarket-energy-campaign.lovable.app</p>
              </div>
            </div>
            <span className="campaign-site-arrow">↗</span>
          </a>

          <div className="socials-grid">
            <a className="social-card" href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <div className="social-card-icon sc-x">𝕏</div>
              <p className="social-card-platform">X / Twitter</p>
              <p className="social-card-handle">@EUSingleMarket</p>
              <span className="social-card-follow">Follow →</span>
            </a>
            <a className="social-card" href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <div className="social-card-icon sc-li">in</div>
              <p className="social-card-platform">LinkedIn</p>
              <p className="social-card-handle">EU Single Market</p>
              <span className="social-card-follow">Follow →</span>
            </a>
            <a className="social-card" href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <div className="social-card-icon sc-ig">◎</div>
              <p className="social-card-platform">Instagram</p>
              <p className="social-card-handle">@euenergymarket</p>
              <span className="social-card-follow">Follow →</span>
            </a>
          </div>

          <button className="btn btn-navy socials-back-btn" onClick={onHome}>
            Help another character →
          </button>
        </div>

      </div>
    </main>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ onPlay, pageKey }: { onPlay: (id: ScenarioId) => void; pageKey: number }) {
  return (
    <main className="shell shell-home">
      <Nav />
      <div className="home-body transition-wrapper" key={pageKey}>
        <div className="home-hero">
          <div className="home-hero-text">
            <p className="eyebrow">EU Energy Single Market</p>
            <h1 className="hero-title">Would Europe Keep&nbsp;the Lights On?</h1>
            <p className="hero-copy">
              Step into a real energy crisis. Make decisions. See what happens when a city, a factory, or a grid has to face a continental shock alone.
            </p>
          </div>
          <img src="/eu-power-logo.png" alt="" className="home-logo-deco" aria-hidden />
        </div>
        <div className="cards-grid">
          {(["marta","luca","sofia"] as ScenarioId[]).map((id, i) => {
            const s = SCENARIOS[id];
            return (
              <article key={id} className="profile-card" style={{ animationDelay:`${i*0.1}s` }}>
                <div className="card-top">
                  <span className="card-emoji">{s.emoji}</span>
                  <span className="tag tag-mint">Play scenario</span>
                </div>
                <h2 className="card-name">{s.name}</h2>
                <p className="card-meta">{s.age} · {s.location}</p>
                <p className="card-role">{s.role}</p>
                <p className="card-blurb">{s.profileText}</p>
                <div className="card-crisis-box">
                  <p className="crisis-label">Crisis</p>
                  <p className="crisis-value">{s.crisisTitle}</p>
                </div>
                <button className="btn btn-navy btn-full" onClick={() => onPlay(id)}>
                  Help {s.name.split(" ")[0]} →
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// ─── PLAY SCREEN ──────────────────────────────────────────────────────────────

function PlayScreen({ scenario, step, onNav, onHome, onReplay, onShowSocials }: {
  scenario: Scenario; step: Step;
  onNav: (id: string) => void;
  onHome: () => void;
  onReplay: () => void;
  onShowSocials: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [blackoutReady, setBlackoutReady] = useState(false);
  const isBlackout = step.type === "blackout";
  const isSuccess  = step.type === "success";
  const isReframe  = step.type === "reframe";
  const isEU       = step.type === "eu_solution";
  const isForced   = step.type === "forced";
  const gridState  = step.gridState ?? "stable";

  // Flicker ONLY on blackout entry: brief flicker then dark
  useEffect(() => {
    if(isBlackout) {
      setBlackoutReady(false);
      const t = setTimeout(() => setBlackoutReady(true), 800);
      return () => clearTimeout(t);
    }
  }, [step.id]);

  const showDash = !isBlackout && !isSuccess && step.type !== "opening";
  const dashKey  = `${scenario.id}-${gridState}`;

  return (
    <main className={`shell transition-wrapper ${isBlackout ? (blackoutReady ? "shell-dark" : "shell-flicker-enter") : ""} ${isSuccess ? "shell-light-success" : ""}`}>
      <Nav dark={isBlackout} onBack={onHome} />

      {/* PERSISTENT GRID DASHBOARD */}
      {showDash && (
        <div className={`dash-bar ${isBlackout ? "dash-bar-dark" : ""} ${isEU ? "dash-bar-eu" : ""}`}>
          <div className="dash-bar-inner">
            <GridDashboard key={dashKey} scenarioId={scenario.id} gridState={gridState} dark={isBlackout} />
          </div>
        </div>
      )}

      <div className={`play-page ${isBlackout ? "play-page-dark" : ""}`}>

        {/* BREADCRUMB */}
        <div className="breadcrumb">
          <span className="breadcrumb-name">{scenario.name}</span>
          <span className="breadcrumb-sep">·</span>
          <span className="breadcrumb-crisis">{scenario.crisisTitle}</span>
          {isForced   && <span className="breadcrumb-pill pill-danger">Last national option</span>}
          {isReframe  && <span className="breadcrumb-pill pill-eu">EU solution</span>}
          {isEU       && <span className="breadcrumb-pill pill-eu">EU solution active</span>}
          {isSuccess  && <span className="breadcrumb-pill pill-success">✓ Resolved</span>}
        </div>

        {/* TITLE */}
        <h1 className={`play-title ${isBlackout ? "play-title-dark" : ""} ${isSuccess ? "play-title-success" : ""} ${isReframe ? "play-title-reframe" : ""}`}>
          {step.title}
        </h1>

        {/* BLACKOUT */}
        {isBlackout && blackoutReady && (
          <div className="blackout-body-wrap fade-in">
            <StoryText paragraphs={step.body} onDone={() => setReady(true)} dark />
            {ready && (
              <div className="fade-in">
                {step.blackoutLine && <p className="blackout-line">{step.blackoutLine}</p>}
                <div className="play-actions">
                  <button className="btn btn-mint" onClick={() => onNav(step.nextStep!)}>{step.buttonLabel} →</button>
                  <button className="btn btn-ghost-dark" onClick={onHome}>Back to profiles</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NORMAL BODY */}
        {!isBlackout && (
          <div className="play-body-wrap">
            <StoryText paragraphs={step.body} onDone={() => setReady(true)} />

            {ready && (
              <div className="fade-in">
                {step.options && (
                  <>
                    {step.type === "crisis"   && <p className="decision-prompt">You need to respond quickly. What should happen first?</p>}
                    {step.type === "decision" && <p className="decision-prompt">What do you try next?</p>}
                    {isForced  && <p className="decision-prompt forced-prompt">One option remains inside the national system.</p>}
                    {isReframe && <p className="decision-prompt reframe-prompt">The European grid is now available.</p>}
                    <div className="options-list">
                      {step.options.map(opt => (
                        <button key={opt.label} className={`option-btn ${isForced ? "option-btn-final" : ""}`} onClick={() => onNav(opt.nextPath)}>
                          <span>{opt.label}</span>
                          <span className="option-arrow">→</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!step.options && step.buttonLabel && step.nextStep && !isSuccess && !isEU && (
                  <button className={`btn story-cta ${isReframe ? "btn-mint" : "btn-navy"}`} onClick={() => onNav(step.nextStep!)}>
                    {isReframe && "⚡ "}{step.buttonLabel} →
                  </button>
                )}

                {/* EU SOLUTION SCREEN — show diagram then CTA */}
                {isEU && step.buttonLabel && step.nextStep && (
                  <div className="eu-solution-wrap">
                    <EuFlowDiagram scenarioId={scenario.id} />
                    <button className="btn btn-navy story-cta" onClick={() => onNav(step.nextStep!)}>
                      {step.buttonLabel} →
                    </button>
                  </div>
                )}

                {/* SUCCESS */}
                {isSuccess && (
                  <div className="success-wrap">
                    <div className="takeaway-block">
                      <p className="takeaway-label">Policy takeaway</p>
                      <p className="takeaway-text">{LESSONS[scenario.id]}</p>
                    </div>
                    <div className="play-actions">
                      <button className="btn btn-ghost" onClick={onReplay}>↺ Replay scenario</button>
                      <button className="btn btn-mint" onClick={onShowSocials}>Follow the campaign →</button>
                    </div>
                    <div style={{ marginTop:"12px" }}>
                      <button className="btn btn-ghost" style={{ fontSize:"0.82rem", padding:"10px 18px" }} onClick={onHome}>Help another character</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}



