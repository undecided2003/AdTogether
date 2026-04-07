package com.adtogether.sdk.models

data class AdModel(
    val id: String,
    val title: String,
    val description: String,
    val clickUrl: String?,
    val imageUrl: String?
)
