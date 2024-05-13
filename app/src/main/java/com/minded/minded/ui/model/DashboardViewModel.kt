package com.minded.minded.ui.model

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.minded.minded.MissingCapability
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch


open class DashboardViewModel() : ViewModel() {
    // Game UI state
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()


    fun setMissingCapabilities(missingCapabilities: List<MissingCapability>) {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.update {
                it.copy(missingCapabilities = missingCapabilities)
            }
        }
    }
}
