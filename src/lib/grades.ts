// Used until an admin saves a custom list to config/grades
export const DEFAULT_GRADES = [4, 5, 8, 9];

export const gradeLabel = (grade?: number | null) => (grade ? `Grade ${grade}` : 'Other');

export const gradeKey = (grade?: number | null) => (grade ? String(grade) : 'other');
