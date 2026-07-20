import { hvPowerFlowchart, hvPowerSystemComponents } from './hvSystemData'
import { hvQuizQuestions } from './quizQuestions'
import type { FlowchartInfo, ComponentDetail, QuizQuestion } from '../types'

export interface ModuleData {
  flowchartInfo: FlowchartInfo
  components: ComponentDetail[]
  questions: QuizQuestion[]
}

/** Canonical module order for the 9-day learning program. */
export const MODULE_ORDER: string[] = [
  'hv-power',
  'lv-power',
  'can-bus',
  'hv-aux',
  'regen-braking',
  'propulsion',
  'overall-power',
  'pneumatic',
]

/** Returns the prerequisite module id, or null for the first module. */
export const getModulePrerequisite = (moduleId: string): string | null => {
  const idx = MODULE_ORDER.indexOf(moduleId)
  if (idx <= 0) return null
  return MODULE_ORDER[idx - 1]
}

const REGISTRY: Record<string, ModuleData> = {
  'hv-power': {
    flowchartInfo: hvPowerFlowchart,
    components: hvPowerSystemComponents,
    questions: hvQuizQuestions,
  },
  'lv-power': {
    flowchartInfo: {
      id: 'lv-power',
      title: 'LV Power System',
      shortDescription: 'Low-voltage control and logic network',
      svgFile: 'Flowchart 2 LV.drawio.svg',
      colorTheme: 'LV',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'can-bus': {
    flowchartInfo: {
      id: 'can-bus',
      title: 'CAN Bus Network',
      shortDescription: 'Controller Area Network communication bus',
      svgFile: 'Flowchart 3 CAN.drawio.svg',
      colorTheme: 'CAN',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'hv-aux': {
    flowchartInfo: {
      id: 'hv-aux',
      title: 'HV Auxiliary Network',
      shortDescription: 'High-voltage auxiliary drives and climate control',
      svgFile: 'Flowchart 4 HVAux.drawio.svg',
      colorTheme: 'HV',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'regen-braking': {
    flowchartInfo: {
      id: 'regen-braking',
      title: 'Regenerative Braking',
      shortDescription: 'Kinetic energy recovery system',
      svgFile: 'Flowchart 5 Regen.drawio.svg',
      colorTheme: 'Powertrain / Drivetrain',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'propulsion': {
    flowchartInfo: {
      id: 'propulsion',
      title: 'Propulsion System',
      shortDescription: 'Traction motor drive control system',
      svgFile: 'Flowchart 6 Propulsion.drawio.svg',
      colorTheme: 'Powertrain / Drivetrain',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'overall-power': {
    flowchartInfo: {
      id: 'overall-power',
      title: 'Overall Power System',
      shortDescription: 'Full powertrain integration and power distribution',
      svgFile: 'Flowchart 7 Overall.drawio.svg',
      colorTheme: 'HV',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
  'pneumatic': {
    flowchartInfo: {
      id: 'pneumatic',
      title: 'Pneumatic Systems',
      shortDescription: 'Air suspension and pneumatic braking system',
      svgFile: 'Flowchart 8 Pneumatic.drawio.svg',
      colorTheme: 'Hydraulic / Mechanical',
      componentIds: [],
    },
    components: [],
    questions: [],
  },
}

export const getModuleInfo = (moduleId: string): FlowchartInfo | undefined => {
  return REGISTRY[moduleId]?.flowchartInfo
}

export const getModuleComponents = (moduleId: string): ComponentDetail[] => {
  return REGISTRY[moduleId]?.components || []
}

export const getModuleQuestions = (moduleId: string): QuizQuestion[] => {
  return REGISTRY[moduleId]?.questions || []
}

export const getAllModules = (): FlowchartInfo[] => {
  return Object.values(REGISTRY).map(m => m.flowchartInfo)
}

export const getModuleIds = (): string[] => {
  return Object.keys(REGISTRY)
}

/** Check whether a module is unlocked given the user's completed modules and unlock dates. */
export const isModuleAvailable = (
  moduleId: string,
  completedModules: string[],
  moduleUnlockDates: Record<string, string>,
  isDateUnlockedFn: (date: string) => boolean,
): boolean => {
  const prereq = getModulePrerequisite(moduleId)
  const prereqMet = prereq === null || completedModules.includes(prereq)
  const unlockDate = moduleUnlockDates[moduleId]
  const dateMet = unlockDate ? isDateUnlockedFn(unlockDate) : true
  return prereqMet && dateMet
}
