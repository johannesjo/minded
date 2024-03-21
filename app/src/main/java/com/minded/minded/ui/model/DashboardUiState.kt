package com.minded.minded.ui.model

import com.minded.minded.data.QuestionCategory
import com.minded.minded.data.QuestionCategoryForDashboard

data class DashboardUiState(val questionCategories: List<QuestionCategoryForDashboard> = emptyList()) {}
