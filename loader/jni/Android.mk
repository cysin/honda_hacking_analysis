# Copyright (C) 2009 The Android Open Source Project
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# TOP_PATH refers to the project root dir (MyProject)
TOP_PATH := $(call my-dir)

# Build autohack loader
include $(CLEAR_VARS)
LOCAL_PATH := $(TOP_PATH)/autohack
LOCAL_MODULE := loader.autohack
LOCAL_C_INCLUDES := /root/Android/Sdk/ndk/22.0.7026061/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/include/
LOCAL_SRC_FILES := loader.autohack.c
LOCAL_ARM_MODE := arm
ifdef DEBUG
$(info Building with configuration: DEBUG)
LOCAL_CFLAGS := -g -Wall -DDEBUG
else
$(info Building with configuration: RELEASE)
LOCAL_CFLAGS := -Wall
endif
include $(BUILD_EXECUTABLE)

# Build vincicar loader
include $(CLEAR_VARS)
LOCAL_PATH := $(TOP_PATH)/vincicar
LOCAL_MODULE := loader.vincicar
LOCAL_C_INCLUDES := /root/Android/Sdk/ndk/22.0.7026061/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/include/
LOCAL_SRC_FILES := loader.vincicar.c
LOCAL_ARM_MODE := arm
ifdef DEBUG
$(info Building with configuration: DEBUG)
LOCAL_CFLAGS := -g -Wall -DDEBUG
else
$(info Building with configuration: RELEASE)
LOCAL_CFLAGS := -Wall
endif
include $(BUILD_EXECUTABLE)



